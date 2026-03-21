import React, { useState, useEffect, useCallback } from "react";
import chatApi from "../../../api/chatcenter";

// ─────────────────────────────────────────────────────────────
// Helpers de fecha
// ─────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────
// Componente chip de filtro activo
// ─────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────
// KanbanFiltros
// Props:
//   id_configuracion : number
//   onChange(filtros): emite { id_encargado, bot_openia, fecha_desde, fecha_hasta }
// ─────────────────────────────────────────────────────────────
const KanbanFiltros = ({ id_configuracion, onChange, onSearch }) => {
  const [agentes, setAgentes] = useState([]);
  const [loadingAg, setLoadingAg] = useState(false);
  const [abierto, setAbierto] = useState(false);

  const [busqueda, setBusqueda] = useState("");

  const handleBusqueda = (value) => {
    setBusqueda(value);
    onSearch?.(value);
  };

  const [local, setLocal] = useState({
    id_encargado: "",
    bot_openia: "",
    fecha_desde: "",
    fecha_hasta: "",
  });

  const set = (k, v) => setLocal((p) => ({ ...p, [k]: v }));

  // ── cuántos filtros están activos ──────────────────────
  const activos = [
    local.id_encargado !== "",
    local.bot_openia !== "",
    local.fecha_desde !== "" || local.fecha_hasta !== "",
  ].filter(Boolean).length;

  // ── cargar agentes solo cuando se abre el panel ────────
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

  // ── convertir local → objeto filtros para el padre ────
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

  return (
    <div style={{ marginBottom: "1.2rem" }}>
      {/* ── Fila de trigger + chips ──────────────────────── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          flexWrap: "wrap",
        }}
      >
        {/* Botón principal */}
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
          Filtros
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

        {/* Chips activos */}
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

        {/* ── Buscador global ── */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: "#fff",
            borderRadius: 12,
            border: "1.5px solid #e5e7eb",
            padding: "7px 12px",
            boxShadow: "0 2px 8px rgba(0,0,0,.06)",
            minWidth: 240,
            marginLeft: "auto",
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
            onChange={(e) => handleBusqueda(e.target.value)}
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
              onClick={() => handleBusqueda("")}
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
      </div>

      {/* ── Panel expandible ─────────────────────────────── */}
      {abierto && (
        <div
          style={{
            marginTop: 10,
            background: "#fff",
            borderRadius: 16,
            border: "1px solid rgba(0,0,0,.08)",
            padding: "18px 20px",
            boxShadow: "0 4px 16px rgba(0,0,0,.07)",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))",
            gap: 16,
          }}
        >
          {/* ── Agente ──────────────────────────────────── */}
          <div>
            <label style={lbl}>
              <i className="bx bx-user" style={{ marginRight: 5 }} />
              Agente encargado
            </label>
            {loadingAg ? (
              <p style={{ fontSize: "0.8rem", color: "#888", margin: "8px 0" }}>
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

          {/* ── Bot ─────────────────────────────────────── */}
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
                    color: local.bot_openia === op.v ? "#4338ca" : "#374151",
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

          {/* ── Fecha último mensaje ─────────────────────── */}
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
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "#e5e7eb")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "#f3f4f6")
                  }
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
              <span style={{ color: "#9ca3af", fontSize: "0.8rem" }}>→</span>
              <input
                type="date"
                value={local.fecha_hasta}
                onChange={(e) => set("fecha_hasta", e.target.value)}
                style={{ ...inp, flex: 1 }}
              />
            </div>
          </div>

          {/* ── Acciones ─────────────────────────────────── */}
          <div
            style={{
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
      )}
    </div>
  );
};

// ── Estilos inline reutilizables ───────────────────────────────
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

export default KanbanFiltros;
