import React, { useEffect, useMemo, useRef, useState } from "react";
import Select from "react-select";
import chatApi from "../../api/chatcenter";

/**
 * Header fusionado de Conexiones: selecciona una conexión y ve las CARDS de
 * métricas del periodo (mismo resumen del dashboard, versión compacta). Si el
 * cliente quiere el detalle completo, el CTA lo lleva al dashboard completo
 * (/conexion-dashboard). Reemplaza los stats genéricos del header antiguo.
 * Datos: dropi_integrations/dashboard/connection-summary.
 */

const fmtNum = (n) => (Number(n) || 0).toLocaleString("es-EC");
const fmt$ = (n) =>
  "$" + (Number(n) || 0).toLocaleString("es-EC", { maximumFractionDigits: 0 });
const fmtPct = (n) => (n == null ? "—" : `${Number(n).toFixed(0)}%`);

const toYMD = (d) => d.toISOString().slice(0, 10);
const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return toYMD(d);
};

const PERIODOS = [
  { key: 7, label: "7 días" },
  { key: 30, label: "30 días" },
  { key: 90, label: "90 días" },
];

// react-select sobre fondo oscuro
const darkSelect = {
  control: (b, s) => ({
    ...b,
    minHeight: 42,
    borderRadius: 12,
    background: "rgba(255,255,255,0.08)",
    borderColor: s.isFocused ? "rgba(165,180,252,0.6)" : "rgba(255,255,255,0.15)",
    boxShadow: s.isFocused ? "0 0 0 3px rgba(99,102,241,.25)" : "none",
    ":hover": { borderColor: "rgba(255,255,255,0.3)" },
    fontSize: 13.5,
  }),
  singleValue: (b) => ({ ...b, color: "#fff", fontWeight: 700 }),
  input: (b) => ({ ...b, color: "#fff" }),
  placeholder: (b) => ({ ...b, color: "rgba(255,255,255,0.5)" }),
  menu: (b) => ({
    ...b,
    borderRadius: 14,
    overflow: "hidden",
    zIndex: 50,
    background: "#1e2140",
    boxShadow: "0 20px 45px rgba(0,0,0,.5)",
  }),
  menuList: (b) => ({ ...b, padding: 6 }),
  option: (b, s) => ({
    ...b,
    borderRadius: 9,
    fontSize: 13,
    cursor: "pointer",
    background: s.isSelected
      ? "#4f46e5"
      : s.isFocused
      ? "rgba(255,255,255,0.08)"
      : "transparent",
    color: "#fff",
  }),
  dropdownIndicator: (b) => ({ ...b, color: "rgba(255,255,255,0.6)" }),
  indicatorSeparator: (b) => ({ ...b, background: "rgba(255,255,255,0.15)" }),
};

function KpiMini({ icon, label, value, sub, color, loading }) {
  return (
    <div className="rounded-xl bg-white/[0.06] ring-1 ring-white/10 px-3 py-2.5 hover:bg-white/[0.09] transition">
      <div className="flex items-center gap-1.5 text-[9.5px] font-semibold uppercase tracking-wide text-white/50">
        <i className={`bx ${icon} text-[13px]`} style={{ color }} />
        {label}
      </div>
      {loading ? (
        <div className="mt-1.5 h-5 w-2/3 rounded bg-white/10 animate-pulse" />
      ) : (
        <div className="mt-1 text-[18px] font-black text-white tabular-nums leading-none">
          {value}
        </div>
      )}
      {sub && !loading && (
        <div className="mt-1 text-[9.5px] text-white/40 truncate">{sub}</div>
      )}
    </div>
  );
}

export default function ResumenConexionHeader({ conexiones = [], onVerDashboard }) {
  const options = useMemo(
    () =>
      conexiones.map((c) => ({
        value: c.id,
        label: c.nombre_configuracion || `Conexión ${c.id}`,
        config: c,
      })),
    [conexiones],
  );

  const [selId, setSelId] = useState(null);
  const [dias, setDias] = useState(30);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const cache = useRef({});
  const reqId = useRef(0);

  // Selección inicial: la de localStorage si está en la lista, si no la primera.
  useEffect(() => {
    if (!options.length) return;
    setSelId((prev) => {
      if (prev && options.some((o) => o.value === prev)) return prev;
      const guardada = Number(localStorage.getItem("id_configuracion")) || null;
      if (guardada && options.some((o) => o.value === guardada)) return guardada;
      return options[0].value;
    });
  }, [options]);

  const selOption = options.find((o) => o.value === selId) || null;

  useEffect(() => {
    if (!selId) return;
    const key = `${selId}|${dias}`;
    if (cache.current[key]) {
      setData(cache.current[key]);
      setLoading(false);
      return;
    }
    const myId = ++reqId.current;
    setLoading(true);
    chatApi
      .post("dropi_integrations/dashboard/connection-summary", {
        id_configuracion: selId,
        from: daysAgo(dias),
        until: toYMD(new Date()),
      })
      .then((res) => {
        if (myId !== reqId.current) return;
        const d = res?.data?.data || null;
        if (d) cache.current[key] = d;
        setData(d);
      })
      .catch(() => {
        if (myId === reqId.current) setData(null);
      })
      .finally(() => {
        if (myId === reqId.current) setLoading(false);
      });
  }, [selId, dias]);

  const kpis = [
    {
      icon: "bx-dollar-circle",
      label: "Facturado",
      color: "#34d399",
      value: fmt$(data?.totalFacturado),
      sub: `${fmtNum(data?.totalPedidos)} pedidos`,
    },
    {
      icon: "bx-wallet",
      label: "Utilidad",
      color: "#a78bfa",
      value: fmt$(data?.totalGanancia),
      sub:
        data?.totalFacturado > 0
          ? `${((data.totalGanancia / data.totalFacturado) * 100).toFixed(0)}% del facturado`
          : "—",
    },
    {
      icon: "bx-package",
      label: "Pedidos",
      color: "#60a5fa",
      value: fmtNum(data?.totalPedidos),
      sub: `${fmtNum(data?.entregadas)} entregados`,
    },
    {
      icon: "bx-message-dots",
      label: "Conversaciones",
      color: "#f472b6",
      value: fmtNum(data?.totalConversaciones),
      sub: `${fmtNum(data?.totalMensajes)} mensajes`,
    },
    {
      icon: "bx-check-shield",
      label: "Confirmación",
      color: "#fbbf24",
      value: fmtPct(data?.pctConfirmacion),
    },
    {
      icon: "bx-check-double",
      label: "Tasa entrega",
      color: "#22d3ee",
      value: fmtPct(data?.tasaEntrega),
    },
  ];

  if (!options.length) return null;

  return (
    <div className="rounded-2xl bg-white/[0.04] ring-1 ring-white/10 p-3.5">
      {/* Fila selector + periodo + CTA */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <i className="bx bx-store-alt text-[20px] text-indigo-300 shrink-0" />
          <div className="w-full max-w-[340px]">
            <Select
              options={options}
              value={selOption}
              onChange={(o) => setSelId(o?.value || null)}
              isSearchable
              placeholder="Elige una conexión…"
              noOptionsMessage={() => "Sin conexiones"}
              menuPortalTarget={typeof document !== "undefined" ? document.body : null}
              styles={{ ...darkSelect, menuPortal: (b) => ({ ...b, zIndex: 60 }) }}
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex bg-black/25 ring-1 ring-white/10 rounded-lg p-0.5">
            {PERIODOS.map((p) => (
              <button
                key={p.key}
                onClick={() => setDias(p.key)}
                className={`px-2.5 py-1.5 rounded-md text-[11px] font-bold transition ${
                  dias === p.key
                    ? "bg-white text-[#171931]"
                    : "text-white/60 hover:text-white"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => selOption && onVerDashboard?.(selOption.config)}
            className="group inline-flex items-center gap-2 px-3.5 py-2 rounded-xl font-semibold text-[13px] text-white bg-gradient-to-r from-indigo-500 to-violet-500 shadow-lg shadow-indigo-900/30 ring-1 ring-white/20 hover:from-indigo-400 hover:to-violet-400 hover:-translate-y-0.5 transition-all"
          >
            <i className="bx bx-bar-chart-alt-2 text-lg" />
            Ver dashboard completo
            <i className="bx bx-right-arrow-alt text-lg transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>
      </div>

      {/* Cards de métricas del periodo */}
      <div className="mt-3 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2">
        {kpis.map((k) => (
          <KpiMini key={k.label} {...k} loading={loading} />
        ))}
      </div>
    </div>
  );
}
