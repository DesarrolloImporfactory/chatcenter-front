import React, { useEffect, useState, useRef } from "react";
import chatApi from "../../api/chatcenter";

/**
 * Ranking · Top tiendas — widget para la barra lateral de Conexiones (comparte
 * espacio con las tarjetas de conexión). Top 5 por VENTA TOTAL del periodo,
 * SEGMENTADO POR PAÍS, SOLO tiendas del sistema, ACTIVAS (no suspendidas) y SIN
 * proveedores. Muestra: nombre de tienda, nº de órdenes y monto vendido.
 * Sin emojis (íconos reales para verse profesional). Datos vía /dropi_stats/ranking_tiendas.
 */
const NOMBRE_PAIS = {
  EC: "Ecuador",
  CO: "Colombia",
  MX: "México",
  PE: "Perú",
  CL: "Chile",
  PA: "Panamá",
  GT: "Guatemala",
  AR: "Argentina",
};
const SIMBOLO = { USD: "$", MXN: "$", COP: "$", PEN: "S/", CLP: "$", GTQ: "Q", ARS: "$" };

const fmtMonto = (n, moneda) =>
  (SIMBOLO[moneda] || "$") +
  (Number(n) || 0).toLocaleString("es-EC", { maximumFractionDigits: 0 });

// Estilo por puesto: oro / plata / bronce (íconos reales, sin emoji).
const RANK = {
  1: { grad: "from-amber-400 to-yellow-500", badge: "bg-amber-400 text-amber-950", crown: true },
  2: { grad: "from-slate-300 to-slate-400", badge: "bg-slate-200 text-slate-700" },
  3: { grad: "from-orange-400 to-orange-500", badge: "bg-orange-300 text-orange-950" },
};
const RANK_DEF = { grad: "from-slate-600 to-slate-800", badge: "bg-white text-slate-600 ring-1 ring-slate-200" };
const inicial = (s) => (s || "?").trim().charAt(0).toUpperCase();

function Stat({ icon, label, value, accent }) {
  return (
    <div className="rounded-xl bg-slate-50 ring-1 ring-slate-100 px-2.5 py-2 text-center">
      <div className={`text-[15px] font-black tabular-nums leading-none ${accent || "text-slate-900"}`}>
        {value}
      </div>
      <div className="mt-1 text-[9px] font-semibold uppercase tracking-wide text-slate-400 flex items-center justify-center gap-0.5">
        {icon && <i className={`bx ${icon} text-[11px]`} />}
        {label}
      </div>
    </div>
  );
}

function Fila({ item, moneda, montoMax }) {
  const mia = item.es_mia;
  const r = RANK[item.posicion] || RANK_DEF;
  const pct = montoMax > 0 ? Math.max(4, (item.monto / montoMax) * 100) : 0;
  return (
    <div
      className={`relative flex items-center gap-3 rounded-xl px-3 py-2 ring-1 overflow-hidden ${
        mia
          ? "bg-violet-50 ring-violet-300"
          : "bg-white ring-slate-200 hover:ring-slate-300"
      }`}
    >
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-y-0 left-0 ${mia ? "bg-violet-100/70" : "bg-slate-100/60"}`}
        style={{ width: `${pct}%` }}
      />
      {/* Avatar de tienda coloreado por puesto + badge numérico */}
      <div className="relative shrink-0">
        <div
          className={`w-10 h-10 rounded-xl grid place-items-center bg-gradient-to-br ${r.grad} text-white text-[15px] font-black ring-2 ring-white shadow-sm`}
        >
          {inicial(item.nombre)}
        </div>
        {r.crown ? (
          <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-amber-400">
            <i className="bx bxs-crown text-[13px] drop-shadow" />
          </span>
        ) : null}
        <span
          className={`absolute -bottom-1.5 -right-1.5 min-w-[17px] h-[17px] px-1 rounded-full grid place-items-center text-[9.5px] font-extrabold ${r.badge}`}
        >
          {item.posicion}
        </span>
      </div>
      {/* Nombre + órdenes */}
      <div className="relative min-w-0 flex-1">
        <div className="text-[13px] font-bold text-slate-900 truncate flex items-center gap-1.5">
          <span className="truncate">{item.nombre}</span>
          {mia && (
            <span className="shrink-0 text-[8px] font-bold uppercase tracking-wide bg-violet-600 text-white px-1 py-0.5 rounded">
              Tú
            </span>
          )}
        </div>
        <div className="text-[11px] text-slate-500 tabular-nums flex items-center gap-1">
          <i className="bx bx-package text-[13px] text-slate-400" />
          {item.pedidos} orden{item.pedidos !== 1 ? "es" : ""}
        </div>
      </div>
      {/* Monto */}
      <div className="relative shrink-0 text-right">
        <div className="text-[14px] font-extrabold text-slate-900 tabular-nums leading-none">
          {fmtMonto(item.monto, moneda)}
        </div>
        <div className="text-[8.5px] text-slate-400 uppercase tracking-wider mt-0.5">
          vendido
        </div>
      </div>
    </div>
  );
}

export default function RankingTiendas() {
  const [periodo, setPeriodo] = useState("mes_actual");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  // Caché por periodo: al alternar Este mes / Mes pasado ya cargados, muestra al
  // instante sin volver a consultar.
  const cache = useRef({});

  useEffect(() => {
    let vivo = true;
    if (cache.current[periodo]) {
      setData(cache.current[periodo]);
      setLoading(false);
      setError(false);
      return () => {
        vivo = false;
      };
    }
    setLoading(true);
    setError(false);
    const id_configuracion = localStorage.getItem("id_configuracion") || null;
    chatApi
      .post("/dropi_stats/ranking_tiendas", { periodo, id_configuracion })
      .then(({ data: resp }) => {
        if (!vivo) return;
        const d = resp?.data || null;
        if (d) cache.current[periodo] = d;
        setData(d);
      })
      .catch(() => vivo && setError(true))
      .finally(() => vivo && setLoading(false));
    return () => {
      vivo = false;
    };
  }, [periodo]);

  const ranking = (data?.ranking || []).slice(0, 5);
  const montoMax = ranking.length ? ranking[0].monto : 0;
  const moneda = data?.moneda || "USD";
  const paisNom = NOMBRE_PAIS[data?.pais] || data?.pais || "";
  const resumen = data?.resumen || {};
  const miPos = data?.mi_tienda?.posicion || null;
  const miFuera =
    data?.mi_tienda && !data.mi_tienda.en_top ? data.mi_tienda : null;

  const TABS = [
    { key: "mes_actual", label: "Este mes" },
    { key: "mes_anterior", label: "Mes pasado" },
  ];

  return (
    <div className="rounded-2xl bg-white ring-1 ring-slate-200 shadow-[0_10px_30px_rgba(2,6,23,.06)] overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-4 pb-3.5 bg-gradient-to-r from-[#171931] to-[#2a2d55]">
        <div className="flex items-center gap-2.5">
          <div className="shrink-0 w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400/30 to-violet-500/25 ring-1 ring-white/20 grid place-items-center">
            <i className="bx bxs-trophy text-[18px] text-amber-300" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[14px] font-extrabold text-white leading-tight">
              Ranking · Top tiendas
            </div>
            <div className="text-[10.5px] text-white/55 truncate">
              Venta total{paisNom ? ` · ${paisNom}` : ""}
            </div>
          </div>
        </div>
        {/* Toggle periodo */}
        <div className="mt-3 flex bg-white/10 ring-1 ring-white/15 rounded-lg p-0.5">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setPeriodo(t.key)}
              className={`flex-1 px-2 py-1.5 rounded-md text-[11px] font-bold transition ${
                periodo === t.key
                  ? "bg-white text-[#171931]"
                  : "text-white/70 hover:text-white"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Cuerpo */}
      <div className="p-3.5">
        {loading ? (
          <div className="space-y-2">
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-[52px] rounded-xl bg-slate-100 animate-pulse"
              />
            ))}
          </div>
        ) : error ? (
          <p className="text-[12px] text-slate-400 py-6 text-center">
            No se pudo cargar el ranking.
          </p>
        ) : ranking.length === 0 ? (
          <p className="text-[12px] text-slate-400 py-6 text-center">
            Aún no hay ventas en este periodo.
          </p>
        ) : (
          <>
            {/* Tira de stats del país */}
            <div className="grid grid-cols-3 gap-2 mb-3">
              <Stat
                icon="bx-medal"
                label="Tu puesto"
                value={miPos ? `#${miPos}` : "—"}
                accent="text-violet-600"
              />
              <Stat
                icon="bx-store"
                label="Tiendas"
                value={(resumen.total_tiendas || ranking.length).toLocaleString("es-EC")}
              />
              <Stat
                icon="bx-dollar"
                label="Vendido"
                value={fmtMonto(resumen.total_pais || 0, moneda)}
                accent="text-emerald-600"
              />
            </div>

            <div className="space-y-1.5">
              {ranking.map((item) => (
                <Fila
                  key={item.id_configuracion}
                  item={item}
                  moneda={moneda}
                  montoMax={montoMax}
                />
              ))}
            </div>

            {miFuera && (
              <>
                <div className="my-2.5 flex items-center gap-2">
                  <div className="flex-1 border-t border-dashed border-slate-200" />
                  <span className="text-[9px] uppercase tracking-widest text-slate-400">
                    tu posición
                  </span>
                  <div className="flex-1 border-t border-dashed border-slate-200" />
                </div>
                <Fila item={miFuera} moneda={moneda} montoMax={montoMax} />
              </>
            )}

            <p className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-slate-400 leading-snug">
              <i className="bx bx-trending-up text-[15px] text-emerald-500" />
              Sigue vendiendo para subir en el ranking
            </p>
          </>
        )}
      </div>
    </div>
  );
}
