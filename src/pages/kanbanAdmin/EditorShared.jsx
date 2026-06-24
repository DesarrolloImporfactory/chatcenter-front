import React from "react";
import Swal from "sweetalert2";

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

// ── Estilos responsive del editor (media queries con !important para
//    ganarle a los estilos inline) ──
export const EditorResponsiveStyles = () => (
  <style>{`
    @media (max-width: 760px) {
      .ek-shell { padding: 0 !important; }
      .ek-card { border-radius: 0 !important; max-width: 100% !important; }
      .ek-header { flex-wrap: wrap !important; padding: 12px 14px !important; }
      .ek-header-right { width: 100% !important; justify-content: flex-end !important; flex-wrap: wrap !important; }
      .ek-viewswitch { order: -1 !important; }
      .ek-body { display: flex !important; flex-direction: column !important; padding: 12px !important; gap: 12px !important; }
      .ek-sidebar { max-height: 30vh !important; }
      .ek-panel { flex: 1 1 auto !important; min-height: 320px !important; }
      .ek-autoscroll { padding: 14px !important; }
    }
  `}</style>
);

export { Z_INDEX_FIX, Toast, SwitchRow, ToggleSwitch, lbl, inp };
