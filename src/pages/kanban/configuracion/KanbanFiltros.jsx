import React, { useState, useEffect, useCallback, useMemo } from "react";
import chatApi from "../../../api/chatcenter";

import ModalPersonalizarVista from "./modales/ModalPersonalizarVista";

// Helpers de fecha
const hoy = () => new Date().toISOString().slice(0, 10);
const hace7 = () => {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return d.toISOString().slice(0, 10);
};
const inicioMes = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
};

const RANGOS = [
  { label: "Hoy", fd: hoy, fh: hoy },
  { label: "Últimos 7 días", fd: hace7, fh: hoy },
  { label: "Este mes", fd: inicioMes, fh: hoy },
  { label: "Todos", fd: () => "", fh: () => "" },
];

const Chip = ({ label, onRemove }) => (
  <div
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 5,
      padding: "4px 10px 4px 12px",
      borderRadius: 999,
      background: "rgba(99,102,241,.1)",
      border: "1px solid rgba(99,102,241,.25)",
      color: "#4338ca",
      fontSize: "0.78rem",
      fontWeight: 600,
    }}
  >
    {label}
    <button
      onClick={onRemove}
      style={{
        background: "none",
        border: "none",
        cursor: "pointer",
        padding: 0,
        color: "#6366f1",
        lineHeight: 1,
        display: "grid",
        placeItems: "center",
      }}
    >
      <i className="bx bx-x" style={{ fontSize: 14 }} />
    </button>
  </div>
);

const KanbanFiltros = ({
  id_configuracion,
  onChange,
  onSearch,
  buscando = false, // ⭐ true mientras el tablero consulta
  // ⭐ NUEVOS props
  kanbanColumnas = [],
  columnasVisibles = null,
  onColumnasVisiblesChange,
  mostrarHuerfanos = true,
  onMostrarHuerfanosChange,
}) => {
  const [agentes, setAgentes] = useState([]);
  const [loadingAg, setLoadingAg] = useState(false);
  const [abierto, setAbierto] = useState(false);
  const [modalVistaOpen, setModalVistaOpen] = useState(false);

  // ⭐ busqueda = lo que se está escribiendo | buscado = lo que YA se aplicó
  const [busqueda, setBusqueda] = useState("");
  const [buscado, setBuscado] = useState("");

  const ejecutarBusqueda = () => {
    const t = busqueda.trim();
    if (t === buscado) return; // no repetir si no cambió
    setBuscado(t);
    onSearch?.(t);
  };

  const limpiarBusqueda = () => {
    setBusqueda("");
    if (buscado !== "") {
      setBuscado("");
      onSearch?.(""); // recarga sin filtro
    }
  };

  const [local, setLocal] = useState({
    id_encargado: "",
    bot_openia: "",
    fecha_desde: "",
    fecha_hasta: "",
  });

  const set = (k, v) => setLocal((p) => ({ ...p, [k]: v }));

  // ⭐ NUEVO: derivar info de la vista
  const totalCols = kanbanColumnas.length;
  const visiblesCount = columnasVisibles?.size ?? totalCols;
  const todasVisibles = visiblesCount === totalCols;

  const activos = [
    local.id_encargado !== "",
    local.bot_openia !== "",
    local.fecha_desde !== "" || local.fecha_hasta !== "",
    !todasVisibles, // ⭐ contar como filtro activo si no se muestran todas
    !mostrarHuerfanos, // ⭐ contar como filtro activo si están ocultos
    buscado !== "", // ⭐ contar la búsqueda activa
  ].filter(Boolean).length;

  const cargarAgentes = useCallback(async () => {
    if (!id_configuracion || agentes.length) return;
    setLoadingAg(true);
    try {
      const { data } = await chatApi.post(
        "/clientes_chat_center/listar_agentes",
        { id_configuracion },
      );
      if (data?.success) setAgentes(data.data || []);
    } catch {
      /* silencioso */
    } finally {
      setLoadingAg(false);
    }
  }, [id_configuracion, agentes.length]);

  useEffect(() => {
    if (abierto) cargarAgentes();
  }, [abierto, cargarAgentes]);

  const buildFiltros = (l = local) => ({
    id_encargado: l.id_encargado !== "" ? Number(l.id_encargado) : null,
    bot_openia: l.bot_openia !== "" ? Number(l.bot_openia) : null,
    fecha_desde: l.fecha_desde || null,
    fecha_hasta: l.fecha_hasta || null,
  });

  const aplicar = (override) => {
    onChange(buildFiltros(override));
    setAbierto(false);
  };

  const limpiar = () => {
    // ⭐ limpiar también la búsqueda
    setBusqueda("");
    if (buscado !== "") {
      setBuscado("");
      onSearch?.("");
    }

    const vacio = {
      id_encargado: "",
      bot_openia: "",
      fecha_desde: "",
      fecha_hasta: "",
    };
    setLocal(vacio);
    onChange({
      id_encargado: null,
      bot_openia: null,
      fecha_desde: null,
      fecha_hasta: null,
    });
    // ⭐ NUEVO: también reset de vista
    if (onColumnasVisiblesChange) {
      onColumnasVisiblesChange(kanbanColumnas.map((c) => c.estado_db));
    }
    if (onMostrarHuerfanosChange) onMostrarHuerfanosChange(true);
    setAbierto(false);
  };

  const aplicarRango = (r) => {
    const nuevo = { ...local, fecha_desde: r.fd(), fecha_hasta: r.fh() };
    setLocal(nuevo);
  };

  const nombreAgente = (id) => {
    const a = agentes.find((x) => String(x.id) === String(id));
    return a ? a.nombre : "—";
  };

  // ⭐ NUEVO: toggle de una columna
  const toggleColumna = (estado_db) => {
    if (!columnasVisibles) return;
    const nuevo = new Set(columnasVisibles);
    if (nuevo.has(estado_db)) {
      nuevo.delete(estado_db);
    } else {
      nuevo.add(estado_db);
    }
    onColumnasVisiblesChange?.([...nuevo]);
  };

  const seleccionarTodas = () => {
    onColumnasVisiblesChange?.(kanbanColumnas.map((c) => c.estado_db));
  };
  const deseleccionarTodas = () => {
    // Mantener al menos 1 (la primera) — el padre también valida
    if (kanbanColumnas.length > 0) {
      onColumnasVisiblesChange?.([kanbanColumnas[0].estado_db]);
    }
  };

  return (
    <div style={{ marginBottom: "1.2rem" }}>
      {/* Trigger + chips */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          flexWrap: "wrap",
        }}
      >
        <button
          onClick={() => setAbierto((p) => !p)}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 7,
            padding: "8px 16px",
            borderRadius: 999,
            border: `1.5px solid ${activos ? "#6366f1" : "rgba(0,0,0,.12)"}`,
            background: activos ? "rgba(99,102,241,.08)" : "#fff",
            color: activos ? "#4338ca" : "#374151",
            fontWeight: 600,
            fontSize: "0.85rem",
            cursor: "pointer",
            transition: "all .15s",
          }}
        >
          <i className="bx bx-filter-alt" style={{ fontSize: "1rem" }} />
          Filtros y vista
          {activos > 0 && (
            <span
              style={{
                background: "#6366f1",
                color: "#fff",
                borderRadius: 999,
                fontSize: "0.72rem",
                fontWeight: 700,
                padding: "1px 7px",
              }}
            >
              {activos}
            </span>
          )}
          <i
            className={`bx bx-chevron-${abierto ? "up" : "down"}`}
            style={{ fontSize: "1rem" }}
          />
        </button>

        {/* Chips filtros existentes */}
        {local.id_encargado !== "" && (
          <Chip
            label={`Agente: ${nombreAgente(local.id_encargado)}`}
            onRemove={() => {
              set("id_encargado", "");
              onChange({ ...buildFiltros(), id_encargado: null });
            }}
          />
        )}
        {local.bot_openia !== "" && (
          <Chip
            label={`Bot: ${local.bot_openia === "1" ? "Activo" : "Inactivo"}`}
            onRemove={() => {
              set("bot_openia", "");
              onChange({ ...buildFiltros(), bot_openia: null });
            }}
          />
        )}
        {(local.fecha_desde || local.fecha_hasta) && (
          <Chip
            label={`Último msg: ${local.fecha_desde || "…"} → ${local.fecha_hasta || "…"}`}
            onRemove={() => {
              set("fecha_desde", "");
              set("fecha_hasta", "");
              onChange({
                ...buildFiltros(),
                fecha_desde: null,
                fecha_hasta: null,
              });
            }}
          />
        )}

        {/* ⭐ NUEVO: Chip búsqueda activa */}
        {buscado && (
          <Chip label={`Buscando: "${buscado}"`} onRemove={limpiarBusqueda} />
        )}

        {/* ⭐ NUEVO: Chip vista */}
        {!todasVisibles && (
          <Chip
            label={`Viendo ${visiblesCount} de ${totalCols} columnas`}
            onRemove={seleccionarTodas}
          />
        )}
        {!mostrarHuerfanos && (
          <Chip
            label="Sin clasificar oculto"
            onRemove={() => onMostrarHuerfanosChange?.(true)}
          />
        )}

        {activos > 0 && (
          <button
            onClick={limpiar}
            style={{
              fontSize: "0.8rem",
              color: "#ef4444",
              background: "none",
              border: "none",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            Limpiar todo
          </button>
        )}

        {/* ⭐ Buscador global — SOLO busca con Enter o con el botón */}
        <div
          style={{
            marginLeft: "auto",
            display: "flex",
            flexDirection: "column",
            gap: 3,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                background: "#fff",
                borderRadius: 12,
                border: `1.5px solid ${buscado ? "#6366f1" : "#e5e7eb"}`,
                padding: "7px 12px",
                boxShadow: "0 2px 8px rgba(0,0,0,.06)",
                minWidth: 240,
              }}
            >
              <i
                className="bx bx-search"
                style={{ color: "#94a3b8", fontSize: "1.1rem", flexShrink: 0 }}
              />
              <input
                type="text"
                placeholder="Buscar por nombre o teléfono..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") ejecutarBusqueda();
                  if (e.key === "Escape") limpiarBusqueda();
                }}
                style={{
                  border: "none",
                  outline: "none",
                  fontSize: ".85rem",
                  color: "#0f172a",
                  background: "transparent",
                  width: "100%",
                  fontFamily: "inherit",
                }}
              />
              {busqueda && (
                <button
                  onClick={limpiarBusqueda}
                  title="Limpiar (Esc)"
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "#94a3b8",
                    padding: 0,
                    display: "flex",
                  }}
                >
                  <i className="bx bx-x" style={{ fontSize: "1.1rem" }} />
                </button>
              )}
            </div>

            <button
              onClick={ejecutarBusqueda}
              disabled={buscando || busqueda.trim() === buscado}
              title="Buscar (Enter)"
              style={{
                padding: "9px 16px",
                borderRadius: 12,
                border: "none",
                background:
                  buscando || busqueda.trim() === buscado
                    ? "#cbd5e1"
                    : "linear-gradient(135deg,#6366f1,#4f46e5)",
                color: "#fff",
                fontWeight: 700,
                fontSize: "0.83rem",
                cursor:
                  buscando || busqueda.trim() === buscado
                    ? "default"
                    : "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                whiteSpace: "nowrap",
                transition: "all .15s",
              }}
            >
              {buscando ? (
                <>
                  <i className="bx bx-loader-alt bx-spin" /> Buscando
                </>
              ) : (
                <>
                  <i className="bx bx-search" /> Buscar
                </>
              )}
            </button>
          </div>

          {/* Aviso: el FULLTEXT ignora palabras de menos de 3 letras */}
          {busqueda.trim().length > 0 &&
            busqueda.trim().length < 3 &&
            !/\d/.test(busqueda) && (
              <span
                style={{
                  fontSize: "0.72rem",
                  color: "#f59e0b",
                  paddingLeft: 4,
                }}
              >
                <i className="bx bx-info-circle" /> Escribe al menos 3 letras
              </span>
            )}
        </div>
      </div>

      {/* Panel expandible */}
      {abierto && (
        <div
          style={{
            marginTop: 10,
            background: "#fff",
            borderRadius: 16,
            border: "1px solid rgba(0,0,0,.08)",
            padding: "18px 20px",
            boxShadow: "0 4px 16px rgba(0,0,0,.07)",
          }}
        >
          {/* ⭐ NUEVO: Sección vista del tablero */}
          {/* Botón compacto para abrir modal de personalización de vista */}
          <div style={{ marginBottom: 16 }}>
            <button
              onClick={() => setModalVistaOpen(true)}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "12px 14px",
                borderRadius: 12,
                border: `1.5px solid ${!todasVisibles || !mostrarHuerfanos ? "#6366f1" : "rgba(0,0,0,.1)"}`,
                background:
                  !todasVisibles || !mostrarHuerfanos
                    ? "rgba(99,102,241,.05)"
                    : "#fafafa",
                cursor: "pointer",
                transition: "all .15s",
                textAlign: "left",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.borderColor = "#6366f1")
              }
              onMouseLeave={(e) => {
                if (todasVisibles && mostrarHuerfanos) {
                  e.currentTarget.style.borderColor = "rgba(0,0,0,.1)";
                }
              }}
            >
              <span
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: "linear-gradient(135deg,#6366f1,#4f46e5)",
                  display: "grid",
                  placeItems: "center",
                  color: "#fff",
                  flexShrink: 0,
                }}
              >
                <i className="bx bx-columns" style={{ fontSize: 18 }} />
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: "0.88rem",
                    color: "#0f172a",
                  }}
                >
                  Personalizar vista del tablero
                </div>
                <div
                  style={{
                    fontSize: "0.76rem",
                    color: "#64748b",
                    marginTop: 2,
                  }}
                >
                  Viendo{" "}
                  <strong style={{ color: "#4338ca" }}>{visiblesCount}</strong>{" "}
                  de {totalCols} columnas
                  {!mostrarHuerfanos && (
                    <span style={{ color: "#92400e" }}>
                      {" "}
                      · "Sin clasificar" oculto
                    </span>
                  )}
                </div>
              </div>
              <i
                className="bx bx-chevron-right"
                style={{ fontSize: 20, color: "#94a3b8", flexShrink: 0 }}
              />
            </button>
          </div>

          {/* Wrapper: filtros (crece) + acciones (derecha fija) */}
          <div
            style={{
              display: "flex",
              gap: 16,
              flexWrap: "wrap",
              alignItems: "stretch",
            }}
          >
            {/* Grid interno de los 3 filtros */}
            <div
              style={{
                flex: "1 1 400px",
                minWidth: 0,
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: 16,
              }}
            >
              {/* Agente */}
              <div>
                <label style={lbl}>
                  <i className="bx bx-user" style={{ marginRight: 5 }} />
                  Agente encargado
                </label>
                {loadingAg ? (
                  <p
                    style={{
                      fontSize: "0.8rem",
                      color: "#888",
                      margin: "8px 0",
                    }}
                  >
                    <i className="bx bx-loader-alt bx-spin" /> Cargando...
                  </p>
                ) : (
                  <select
                    value={local.id_encargado}
                    onChange={(e) => set("id_encargado", e.target.value)}
                    style={sel}
                  >
                    <option value="">Todos los agentes</option>
                    {agentes.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.nombre}
                        {a.rol ? ` · ${a.rol}` : ""}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Bot */}
              <div>
                <label style={lbl}>
                  <i className="bx bx-bot" style={{ marginRight: 5 }} />
                  Estado del bot
                </label>
                <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                  {[
                    { v: "", label: "Todos" },
                    { v: "1", label: "🟢 Activo" },
                    { v: "0", label: "🔴 Inactivo" },
                  ].map((op) => (
                    <button
                      key={op.v}
                      onClick={() => set("bot_openia", op.v)}
                      style={{
                        flex: 1,
                        padding: "7px 0",
                        borderRadius: 10,
                        border: `1.5px solid ${local.bot_openia === op.v ? "#6366f1" : "rgba(0,0,0,.1)"}`,
                        background:
                          local.bot_openia === op.v
                            ? "rgba(99,102,241,.08)"
                            : "#fafafa",
                        color:
                          local.bot_openia === op.v ? "#4338ca" : "#374151",
                        fontWeight: local.bot_openia === op.v ? 700 : 500,
                        fontSize: "0.8rem",
                        cursor: "pointer",
                        transition: "all .12s",
                      }}
                    >
                      {op.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Fecha */}
              <div>
                <label style={lbl}>
                  <i className="bx bx-calendar" style={{ marginRight: 5 }} />
                  Último mensaje
                </label>
                <div
                  style={{
                    display: "flex",
                    gap: 6,
                    flexWrap: "wrap",
                    margin: "6px 0 8px",
                  }}
                >
                  {RANGOS.map((r) => (
                    <button
                      key={r.label}
                      onClick={() => aplicarRango(r)}
                      style={{
                        padding: "4px 10px",
                        borderRadius: 999,
                        border: "1px solid rgba(0,0,0,.1)",
                        background: "#f3f4f6",
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        cursor: "pointer",
                        color: "#374151",
                      }}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input
                    type="date"
                    value={local.fecha_desde}
                    onChange={(e) => set("fecha_desde", e.target.value)}
                    style={{ ...inp, flex: 1 }}
                  />
                  <span style={{ color: "#9ca3af", fontSize: "0.8rem" }}>
                    →
                  </span>
                  <input
                    type="date"
                    value={local.fecha_hasta}
                    onChange={(e) => set("fecha_hasta", e.target.value)}
                    style={{ ...inp, flex: 1 }}
                  />
                </div>
              </div>
            </div>
            {/* fin grid interno de filtros */}

            {/* Acciones - ancho fijo a la derecha */}
            <div
              style={{
                flex: "0 0 180px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "flex-end",
                gap: 8,
              }}
            >
              <button
                onClick={() => aplicar()}
                style={{
                  padding: 10,
                  borderRadius: 12,
                  border: "none",
                  background: "linear-gradient(135deg,#6366f1,#4f46e5)",
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: "0.85rem",
                  cursor: "pointer",
                  boxShadow: "0 3px 8px rgba(99,102,241,.35)",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                }}
              >
                <i className="bx bx-check" />
                Aplicar filtros
              </button>
              <button
                onClick={limpiar}
                style={{
                  padding: 9,
                  borderRadius: 12,
                  border: "1px solid rgba(0,0,0,.1)",
                  background: "#fff",
                  color: "#6b7280",
                  fontWeight: 600,
                  fontSize: "0.85rem",
                  cursor: "pointer",
                }}
              >
                Limpiar
              </button>
            </div>
          </div>
          {/* fin wrapper flex filtros + acciones */}
        </div>
      )}
      {/* Modal personalizar vista */}
      <ModalPersonalizarVista
        open={modalVistaOpen}
        onClose={() => setModalVistaOpen(false)}
        kanbanColumnas={kanbanColumnas}
        columnasVisibles={columnasVisibles}
        onColumnasVisiblesChange={onColumnasVisiblesChange}
        mostrarHuerfanos={mostrarHuerfanos}
        onMostrarHuerfanosChange={onMostrarHuerfanosChange}
      />
    </div>
  );
};

// Estilos compartidos
const lbl = {
  display: "block",
  fontSize: "0.8rem",
  fontWeight: 600,
  color: "#374151",
  marginBottom: 4,
};
const sel = {
  width: "100%",
  padding: "8px 10px",
  borderRadius: 10,
  border: "1px solid rgba(0,0,0,.12)",
  fontSize: "0.82rem",
  outline: "none",
  background: "#fafafa",
  color: "#374151",
};
const inp = {
  padding: "7px 9px",
  borderRadius: 10,
  border: "1px solid rgba(0,0,0,.12)",
  fontSize: "0.8rem",
  outline: "none",
  background: "#fafafa",
  color: "#374151",
};
const quickBtnStyle = (active) => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 5,
  padding: "6px 12px",
  borderRadius: 999,
  border: `1.5px solid ${active ? "#6366f1" : "rgba(0,0,0,.1)"}`,
  background: active ? "rgba(99,102,241,.08)" : "#fafafa",
  color: active ? "#4338ca" : "#6b7280",
  cursor: "pointer",
  fontSize: "0.78rem",
  fontWeight: 600,
});

export default KanbanFiltros;
