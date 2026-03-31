// src/page/clientes/DateRangeFilter.jsx
import React, { useState, useRef, useEffect } from "react";

const TIPOS = [
  { value: "created",   label: "Fecha de creación",   icon: "bx-user-plus" },
  { value: "actividad", label: "Última actividad",     icon: "bx-time-five" },
];

export default function DateRangeFilter({ value, onChange }) {
  // value = { tipo: 'created'|'actividad', desde: 'YYYY-MM-DD', hasta: 'YYYY-MM-DD' }
  // onChange = (newValue | null) => void

  const [open, setOpen]   = useState(false);
  const [tipo, setTipo]   = useState(value?.tipo   || "created");
  const [desde, setDesde] = useState(value?.desde  || "");
  const [hasta, setHasta] = useState(value?.hasta  || "");
  const ref = useRef(null);

  // Cerrar al click fuera
  useEffect(() => {
    const fn = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  // Sync value externo → estado interno
  useEffect(() => {
    if (!value) { setDesde(""); setHasta(""); return; }
    setTipo(value.tipo   || "created");
    setDesde(value.desde || "");
    setHasta(value.hasta || "");
  }, [value]);

  const isActive = !!(value?.desde || value?.hasta);
  const tipoLabel = TIPOS.find(t => t.value === tipo)?.label || "Fecha";

  const handleApply = () => {
    if (!desde && !hasta) { onChange(null); setOpen(false); return; }
    onChange({ tipo, desde, hasta });
    setOpen(false);
  };

  const handleClear = () => {
    setDesde(""); setHasta("");
    onChange(null);
    setOpen(false);
  };

  // Preview del rango activo
  const preview = () => {
    if (!value?.desde && !value?.hasta) return null;
    const d = value.desde ? value.desde.split("-").reverse().join("/") : "...";
    const h = value.hasta ? value.hasta.split("-").reverse().join("/") : "...";
    return `${d} → ${h}`;
  };

  return (
    <div ref={ref} style={{ position: "relative" }}>
      {/* Botón disparador */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display:        "inline-flex",
          alignItems:     "center",
          gap:            6,
          padding:        "5px 12px",
          borderRadius:   8,
          border:         `1.5px solid ${isActive ? "#6366f1" : "#e2e8f0"}`,
          background:     isActive ? "rgba(99,102,241,.08)" : "#fff",
          color:          isActive ? "#4338ca" : "#374151",
          fontSize:       13,
          fontWeight:     isActive ? 600 : 500,
          cursor:         "pointer",
          whiteSpace:     "nowrap",
          transition:     "all .15s",
          fontFamily:     "inherit",
          boxShadow:      open ? "0 0 0 3px rgba(99,102,241,.15)" : "0 1px 2px rgba(0,0,0,.06)",
        }}
      >
        <i className={`bx bx-calendar text-base`} style={{ fontSize: 15 }} />
        {isActive ? (
          <>
            <span style={{ fontSize: 12 }}>{preview()}</span>
            <span style={{
              fontSize: 11, background: "#6366f1", color: "#fff",
              borderRadius: 999, padding: "1px 6px", fontWeight: 700,
            }}>
              {TIPOS.find(t => t.value === value.tipo)?.label.split(" ")[0]}
            </span>
          </>
        ) : (
          <span>Fecha</span>
        )}
        <i className={`bx bx-chevron-${open ? "up" : "down"}`} style={{ fontSize: 14, opacity: .6 }} />
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{
          position:    "absolute",
          top:         "calc(100% + 6px)",
          left:        0,
          zIndex:      999,
          background:  "#fff",
          borderRadius: 14,
          border:      "1px solid #e2e8f0",
          boxShadow:   "0 12px 32px rgba(0,0,0,.12)",
          padding:     16,
          width:       280,
          display:     "flex",
          flexDirection: "column",
          gap:         12,
        }}>
          {/* Tipo de fecha */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 6 }}>
              Filtrar por
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              {TIPOS.map(t => (
                <button
                  key={t.value}
                  onClick={() => setTipo(t.value)}
                  style={{
                    flex:        1,
                    display:     "flex",
                    alignItems:  "center",
                    gap:         5,
                    padding:     "7px 10px",
                    borderRadius: 9,
                    border:      `1.5px solid ${tipo === t.value ? "#6366f1" : "#e5e7eb"}`,
                    background:  tipo === t.value ? "rgba(99,102,241,.07)" : "#fafafa",
                    color:       tipo === t.value ? "#4338ca" : "#374151",
                    fontSize:    12,
                    fontWeight:  tipo === t.value ? 700 : 500,
                    cursor:      "pointer",
                    transition:  "all .12s",
                    fontFamily:  "inherit",
                  }}
                >
                  <i className={`bx ${t.icon}`} style={{ fontSize: 13 }} />
                  {t.label.split(" ").slice(-1)[0]}
                </button>
              ))}
            </div>
          </div>

          {/* Rango */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: "#64748b", display: "block", marginBottom: 3 }}>
                Desde
              </label>
              <input
                type="date"
                value={desde}
                max={hasta || undefined}
                onChange={e => setDesde(e.target.value)}
                style={{
                  width: "100%", padding: "7px 10px", borderRadius: 8,
                  border: "1.5px solid #e5e7eb", fontSize: 13, color: "#0f172a",
                  background: "#fafafa", outline: "none", boxSizing: "border-box",
                  fontFamily: "inherit",
                }}
              />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: "#64748b", display: "block", marginBottom: 3 }}>
                Hasta
              </label>
              <input
                type="date"
                value={hasta}
                min={desde || undefined}
                onChange={e => setHasta(e.target.value)}
                style={{
                  width: "100%", padding: "7px 10px", borderRadius: 8,
                  border: "1.5px solid #e5e7eb", fontSize: 13, color: "#0f172a",
                  background: "#fafafa", outline: "none", boxSizing: "border-box",
                  fontFamily: "inherit",
                }}
              />
            </div>
          </div>

          {/* Shortcuts */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 6 }}>
              Accesos rápidos
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
              {[
                { label: "Hoy",          fn: () => { const d = hoy(); setDesde(d); setHasta(d); } },
                { label: "Ayer",         fn: () => { const d = diasAtras(1); setDesde(d); setHasta(d); } },
                { label: "Últ. 7 días",  fn: () => { setDesde(diasAtras(6)); setHasta(hoy()); } },
                { label: "Últ. 30 días", fn: () => { setDesde(diasAtras(29)); setHasta(hoy()); } },
                { label: "Este mes",     fn: () => { const n = new Date(); setDesde(`${n.getFullYear()}-${pad(n.getMonth()+1)}-01`); setHasta(hoy()); } },
              ].map(s => (
                <button
                  key={s.label}
                  onClick={s.fn}
                  style={{
                    padding: "4px 9px", borderRadius: 999, border: "1px solid #e5e7eb",
                    background: "#f8fafc", color: "#374151", fontSize: 11, fontWeight: 600,
                    cursor: "pointer", transition: "all .1s", fontFamily: "inherit",
                  }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = "#6366f1"}
                  onMouseLeave={e => e.currentTarget.style.borderColor = "#e5e7eb"}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Botones acción */}
          <div style={{ display: "flex", gap: 8, paddingTop: 4, borderTop: "1px solid #f1f5f9" }}>
            <button
              onClick={handleClear}
              style={{
                flex: 1, padding: "7px", borderRadius: 9, border: "1.5px solid #e5e7eb",
                background: "#fff", color: "#374151", fontSize: 12, fontWeight: 600,
                cursor: "pointer", fontFamily: "inherit",
              }}
            >
              Limpiar
            </button>
            <button
              onClick={handleApply}
              disabled={!desde && !hasta}
              style={{
                flex: 2, padding: "7px", borderRadius: 9, border: "none",
                background: "linear-gradient(135deg,#6366f1,#4f46e5)",
                color: "#fff", fontSize: 12, fontWeight: 700,
                cursor: (!desde && !hasta) ? "not-allowed" : "pointer",
                opacity: (!desde && !hasta) ? .5 : 1,
                fontFamily: "inherit",
              }}
            >
              Aplicar filtro
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Helpers fecha
const hoy      = ()        => new Date().toISOString().slice(0, 10);
const pad      = (n)       => String(n).padStart(2, "0");
const diasAtras = (n)      => { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10); };