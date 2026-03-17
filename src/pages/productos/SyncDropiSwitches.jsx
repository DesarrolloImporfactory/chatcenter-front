// src/components/productos/SyncDropiSwitches.jsx
import React, { useEffect, useState, useRef } from "react";
import chatApi from "../../api/chatcenter";

/* ─────────────────────────────────────────────────────────────
   Configuración de los 3 switches
───────────────────────────────────────────────────────────── */
const SYNC_FIELDS = [
  {
    key: "sync_stock",
    label: "Stock",
    icon: "bx-box",
    tooltip:
      "Sincroniza diariamente las cantidades disponibles desde las bodegas de Dropi hacia tus productos.",
    color: "#10b981", // emerald-500
  },
  {
    key: "sync_sale_price",
    label: "Precio proveedor",
    icon: "bx-purchase-tag",
    tooltip:
      "Actualiza automáticamente el precio del proveedor en tus productos cada día.",
    color: "#f59e0b", // amber-500
  },
  {
    key: "sync_suggested_price",
    label: "Precio sugerido",
    icon: "bx-dollar-circle",
    tooltip:
      "Sobrescribe tu precio de venta con el precio sugerido que define Dropi diariamente.",
    color: "#6366f1", // indigo-500
  },
];

/* ─────────────────────────────────────────────────────────────
   Componente individual: Switch con tooltip
───────────────────────────────────────────────────────────── */
const SyncSwitch = ({ field, checked, onChange, saving }) => {
  const [showTip, setShowTip] = useState(false);
  const tipRef = useRef(null);
  const wrapRef = useRef(null);

  // Cerrar tooltip al hacer click afuera
  useEffect(() => {
    if (!showTip) return;
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setShowTip(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showTip]);

  return (
    <div ref={wrapRef} className="relative flex items-center gap-1.5 group">
      {/* Switch track + knob */}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={saving}
        onClick={() => onChange(!checked)}
        className={`
          relative inline-flex h-[18px] w-[32px] flex-shrink-0 cursor-pointer rounded-full
          transition-colors duration-200 ease-in-out focus:outline-none
          disabled:opacity-50 disabled:cursor-wait
        `}
        style={{
          backgroundColor: checked ? field.color : "rgb(203 213 225)", // slate-300
        }}
      >
        <span
          className={`
            pointer-events-none inline-block h-[14px] w-[14px] rounded-full bg-white
            shadow-sm transform transition-transform duration-200 ease-in-out
            ${checked ? "translate-x-[14px]" : "translate-x-[2px]"}
          `}
          style={{ marginTop: "2px" }}
        />
      </button>

      {/* Label */}
      <span
        className={`text-[11.5px] font-medium select-none whitespace-nowrap transition-colors
          ${checked ? "text-slate-700" : "text-slate-400"}`}
      >
        {field.label}
      </span>

      {/* Info icon — trigger del tooltip */}
      <button
        type="button"
        onClick={() => setShowTip((v) => !v)}
        onMouseEnter={() => setShowTip(true)}
        onMouseLeave={() => setShowTip(false)}
        className="w-3.5 h-3.5 rounded-full flex items-center justify-center
          text-slate-300 hover:text-slate-500 transition-colors flex-shrink-0"
        aria-label={`Info: ${field.label}`}
      >
        <i className="bx bx-info-circle text-xs" />
      </button>

      {/* Tooltip */}
      {showTip && (
        <div
          ref={tipRef}
          className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2
            bg-slate-800 text-white text-[11px] leading-relaxed
            px-3 py-2 rounded-lg shadow-lg w-[210px] pointer-events-none"
        >
          {field.tooltip}
          <div
            className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0
              border-l-[5px] border-r-[5px] border-t-[5px]
              border-l-transparent border-r-transparent border-t-slate-800"
          />
        </div>
      )}
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
   Componente principal: barra de switches
───────────────────────────────────────────────────────────── */
const SyncDropiSwitches = () => {
  const [config, setConfig] = useState({
    sync_stock: false,
    sync_sale_price: false,
    sync_suggested_price: false,
  });
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  // Cargar estado actual
  useEffect(() => {
    const idc = localStorage.getItem("id_configuracion");
    if (!idc) return;
    chatApi
      .get(`/dropi_integrations/sync-config?id_configuracion=${idc}`)
      .then(({ data }) => {
        if (data?.data) {
          setConfig({
            sync_stock: !!data.data.sync_stock,
            sync_sale_price: !!data.data.sync_sale_price,
            sync_suggested_price: !!data.data.sync_suggested_price,
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  // Handler de cambio — fire & forget con feedback visual
  const handleToggle = async (key, value) => {
    const prev = { ...config };
    setConfig((c) => ({ ...c, [key]: value }));
    setSaving(true);

    try {
      const idc = localStorage.getItem("id_configuracion");
      await chatApi.put("/dropi_integrations/sync-config", {
        id_configuracion: parseInt(idc),
        [key]: value,
      });
    } catch {
      // Revert on error
      setConfig(prev);
    } finally {
      setSaving(false);
    }
  };

  if (!loaded) return null;

  return (
    <div
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg
        bg-slate-50 border border-slate-200/80"
    >
      {/* Label del grupo */}
      <div className="flex items-center gap-1 mr-1">
        <i className="bx bx-revision text-slate-400 text-sm" />
        <span className="text-[10.5px] font-semibold uppercase tracking-wide text-slate-400 whitespace-nowrap">
          Sync
        </span>
      </div>

      {/* Separador */}
      <div className="w-px h-4 bg-slate-200 mx-0.5" />

      {/* Switches */}
      {SYNC_FIELDS.map((field) => (
        <SyncSwitch
          key={field.key}
          field={field}
          checked={config[field.key]}
          onChange={(val) => handleToggle(field.key, val)}
          saving={saving}
        />
      ))}
    </div>
  );
};

export default SyncDropiSwitches;
