import React, { useState, useMemo } from "react";

/* Modal compacto para elegir qué columnas del tablero se muestran.
   Cada columna es un chip clicable con un atajo "Solo" que deja visible
   únicamente esa (y oculta "Sin clasificar" de paso). "Sin clasificar" vive
   en el mismo grid como un chip más, para que la vista sea una sola verdad. */

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

  // Hooks antes del return condicional
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
  const todoVisible = visiblesCount === totalCols && mostrarHuerfanos;

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

  const mostrarTodas = () => {
    onColumnasVisiblesChange?.(kanbanColumnas.map((c) => c.estado_db));
    onMostrarHuerfanosChange?.(true);
  };

  /* "Solo esta": la columna elegida queda como única visible y "Sin
     clasificar" se oculta también — solo una es solo una. */
  const soloEsta = (estado_db) => {
    onColumnasVisiblesChange?.([estado_db]);
    onMostrarHuerfanosChange?.(false);
  };

  const renderChip = ({ key, nombre, accent, visible, onToggle, onSolo }) => (
    <div
      key={key}
      onClick={onToggle}
      title={nombre}
      style={{
        padding: "8px 10px",
        borderRadius: 10,
        cursor: "pointer",
        background: visible ? "rgba(99,102,241,.05)" : "#fff",
        border: `1.5px solid ${visible ? "rgba(99,102,241,.4)" : "#e2e8f0"}`,
        transition: "all .12s",
        minWidth: 0,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          minWidth: 0,
        }}
      >
        <span
          style={{
            width: 16,
            height: 16,
            borderRadius: 5,
            flexShrink: 0,
            border: `1.5px solid ${visible ? "#6366f1" : "#cbd5e1"}`,
            background: visible ? "#6366f1" : "#fff",
            display: "grid",
            placeItems: "center",
            color: "#fff",
          }}
        >
          {visible && <i className="bx bx-check" style={{ fontSize: 12 }} />}
        </span>
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: 999,
            background: accent,
            flexShrink: 0,
          }}
        />
        <span
          style={{
            flex: 1,
            minWidth: 0,
            fontSize: "0.78rem",
            fontWeight: visible ? 700 : 500,
            color: visible ? "#0f172a" : "#64748b",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {nombre}
        </span>
      </div>
      {onSolo && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSolo();
          }}
          title={`Ocultar todas las demás columnas`}
          style={{
            marginTop: 4,
            marginLeft: 24,
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "#818cf8",
            fontSize: "0.68rem",
            fontWeight: 700,
            padding: 0,
            display: "block",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = "#4f46e5";
            e.currentTarget.style.textDecoration = "underline";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = "#818cf8";
            e.currentTarget.style.textDecoration = "none";
          }}
        >
          Mostrar solo esta
        </button>
      )}
    </div>
  );

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
          borderRadius: 16,
          width: "100%",
          maxWidth: 470,
          maxHeight: "82vh",
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
            padding: "14px 18px",
            borderBottom: "1px solid #f1f5f9",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <span
            style={{
              width: 30,
              height: 30,
              borderRadius: 9,
              background: "linear-gradient(135deg,#6366f1,#4f46e5)",
              display: "grid",
              placeItems: "center",
              color: "#fff",
              flexShrink: 0,
            }}
          >
            <i className="bx bx-columns" style={{ fontSize: 16 }} />
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: "0.95rem",
                fontWeight: 700,
                color: "#0f172a",
                lineHeight: 1.2,
              }}
            >
              Personalizar vista
            </div>
            <div style={{ fontSize: "0.72rem", color: "#64748b" }}>
              Elige qué columnas ves en el tablero
            </div>
          </div>

          {!todoVisible && (
            <button
              onClick={mostrarTodas}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "#4f46e5",
                fontSize: "0.74rem",
                fontWeight: 700,
                whiteSpace: "nowrap",
              }}
            >
              Mostrar todas
            </button>
          )}

          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              padding: 4,
              borderRadius: 8,
              color: "#64748b",
              display: "grid",
              placeItems: "center",
            }}
          >
            <i className="bx bx-x" style={{ fontSize: 20 }} />
          </button>
        </div>

        {/* ── Búsqueda (solo si 8+ columnas) ── */}
        {kanbanColumnas.length >= 8 && (
          <div style={{ padding: "10px 18px 0" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                background: "#f8fafc",
                borderRadius: 10,
                padding: "6px 10px",
                border: "1px solid #e2e8f0",
              }}
            >
              <i
                className="bx bx-search"
                style={{ color: "#94a3b8", fontSize: 14 }}
              />
              <input
                type="text"
                placeholder="Buscar columna…"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                style={{
                  flex: 1,
                  border: "none",
                  outline: "none",
                  background: "transparent",
                  fontSize: "0.8rem",
                  color: "#0f172a",
                  fontFamily: "inherit",
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
                    padding: 0,
                    display: "flex",
                  }}
                >
                  <i className="bx bx-x" style={{ fontSize: 15 }} />
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── Grid de chips (columnas + "Sin clasificar") ── */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "12px 18px",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))",
            gap: 8,
            alignContent: "start",
          }}
        >
          {columnasFiltradas.length === 0 ? (
            <div
              style={{
                gridColumn: "1 / -1",
                textAlign: "center",
                padding: 24,
                color: "#94a3b8",
                fontSize: "0.8rem",
              }}
            >
              No se encontraron columnas
            </div>
          ) : (
            columnasFiltradas.map((col) =>
              renderChip({
                key: col.estado_db,
                nombre: col.nombre,
                accent: col.color_texto || "#6366f1",
                visible: isVisible(col.estado_db),
                onToggle: () => toggle(col.estado_db),
                onSolo: () => soloEsta(col.estado_db),
              }),
            )
          )}

          {/* "Sin clasificar" como un chip más del grid */}
          {!busqueda.trim() &&
            renderChip({
              key: "__sin_clasificar",
              nombre: "Sin clasificar",
              accent: "#f59e0b",
              visible: mostrarHuerfanos,
              onToggle: () => onMostrarHuerfanosChange?.(!mostrarHuerfanos),
              onSolo: null,
            })}
        </div>

        {/* ── Pie ── */}
        <div
          style={{
            padding: "10px 18px 14px",
            borderTop: "1px solid #f1f5f9",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <span style={{ flex: 1 }} />
          <button
            onClick={onClose}
            style={{
              padding: "8px 20px",
              borderRadius: 10,
              border: "none",
              background: "linear-gradient(135deg,#6366f1,#4f46e5)",
              color: "#fff",
              fontWeight: 700,
              fontSize: "0.82rem",
              cursor: "pointer",
              boxShadow: "0 3px 10px rgba(99,102,241,.3)",
            }}
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
