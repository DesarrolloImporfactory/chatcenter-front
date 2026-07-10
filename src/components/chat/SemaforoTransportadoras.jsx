import React, { useEffect, useState, useRef } from "react";
import chatApi from "../../api/chatcenter";

/**
 * Semáforo de transportadoras: al seleccionar la CIUDAD, muestra qué
 * transportadora entrega mejor en esa ciudad (últimos 1/3/6 meses de
 * dropi_orders_cache). La tasa se mide SOLO por ciudad — la provincial daba un
 * valor demasiado general. Ayuda al cliente a elegir transportadora antes de
 * crear la orden. El indicador es un semáforo real (3 luces, brilla la activa).
 */
const COLORES = {
  verde: {
    luz: "#22c55e",
    glow: "34,197,94",
    text: "#4ade80",
    label: "Entrega óptima",
  },
  amarillo: {
    luz: "#f59e0b",
    glow: "245,158,11",
    text: "#fbbf24",
    label: "Entrega aceptable",
  },
  rojo: {
    luz: "#ef4444",
    glow: "239,68,68",
    text: "#f87171",
    label: "Entrega deficiente",
  },
  gris: {
    luz: "#64748b",
    glow: "100,116,139",
    text: "#94a3b8",
    label: "Sin datos",
  },
};

const PERIODOS = [
  { key: "1mes", label: "1 mes" },
  { key: "3meses", label: "3 meses" },
  { key: "6meses", label: "6 meses" },
];

/** Semáforo físico en miniatura: carcasa oscura con 3 luces; brilla la activa. */
function MiniSemaforo({ activo }) {
  const luces = ["rojo", "amarillo", "verde"];
  return (
    <span className="inline-flex flex-col items-center gap-[3px] rounded-[5px] bg-black/60 ring-1 ring-white/10 px-[3px] py-[4px] shrink-0">
      {luces.map((color) => {
        const on = color === activo;
        const c = COLORES[color];
        return (
          <span
            key={color}
            className="block w-[9px] h-[9px] rounded-full transition-all"
            style={{
              background: on ? c.luz : "#1f2937",
              boxShadow: on
                ? `0 0 5px 1px rgba(${c.glow},.9), inset 0 0 2px rgba(255,255,255,.5)`
                : "inset 0 0 2px rgba(0,0,0,.8)",
              opacity: on ? 1 : 0.5,
            }}
          />
        );
      })}
    </span>
  );
}

export default function SemaforoTransportadoras({ ciudad }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [abierto, setAbierto] = useState(true);
  const [periodo, setPeriodo] = useState("1mes");
  const reqId = useRef(0);
  // Caché por ciudad+periodo: al alternar periodos ya visitados, muestra al
  // instante sin volver a pegarle al servidor.
  const cache = useRef({});

  // Modo demo: en localhost, Dropi de pruebas no devuelve ciudad, así que si no
  // llega, usamos una ciudad real con datos (Guayaquil) para previsualizar.
  const isLocal =
    typeof window !== "undefined" &&
    /localhost|127\.0\.0\.1/.test(window.location.hostname || "");
  const demo = isLocal && !ciudad;
  const ciudadEff = ciudad || (demo ? "GUAYAQUIL" : "");

  useEffect(() => {
    if (!ciudadEff) {
      setData(null);
      return;
    }
    const key = `${ciudadEff}|${periodo}`;
    // Cache hit → instantáneo, sin consultar.
    if (cache.current[key]) {
      setData(cache.current[key]);
      setLoading(false);
      return;
    }
    const myId = ++reqId.current;
    setData(null); // limpia para mostrar el skeleton mientras carga
    setLoading(true);
    chatApi
      .post("/dropi_stats/semaforo_transportadoras", {
        ciudad: ciudadEff,
        periodo,
      })
      .then(({ data: resp }) => {
        if (myId !== reqId.current) return;
        const d = resp?.data || null;
        if (d) cache.current[key] = d;
        setData(d);
      })
      .catch(() => {
        if (myId === reqId.current) setData(null);
      })
      .finally(() => {
        if (myId === reqId.current) setLoading(false);
      });
  }, [ciudadEff, periodo]);

  // Sin ciudad no hay semáforo: la tasa solo se mide por ciudad seleccionada.
  if (!ciudadEff) return null;

  const lista = data?.transportadoras || [];
  const conDatos = lista.filter((t) => t.suficiente);
  const mejor = conDatos[0] || null;
  const zona = ciudadEff;
  const periodoLabel =
    PERIODOS.find((p) => p.key === periodo)?.label.toLowerCase() || "";

  return (
    <div className="mx-3.5 mb-2 rounded-xl border border-white/[0.08] bg-gradient-to-b from-white/[0.04] to-white/[0.01] overflow-hidden">
      {/* Encabezado */}
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        className="w-full flex items-center gap-2 px-3 py-2.5 text-left"
      >
        <MiniSemaforo activo={mejor?.semaforo || "gris"} />
        <span className="flex-1 min-w-0">
          <span className="block text-[11px] font-bold text-white/90 leading-tight">
            Semáforo de transportadoras
          </span>
          <span className="block text-[9.5px] text-white/45 truncate">
            Entregas en <span className="text-violet-200">{zona}</span> ·{" "}
            {periodoLabel}
            {demo && (
              <span className="ml-1 text-[8px] font-bold uppercase tracking-wide bg-amber-400/20 text-amber-300 px-1 py-0.5 rounded">
                demo
              </span>
            )}
          </span>
        </span>
        {loading && (
          <i className="bx bx-loader-alt bx-spin text-white/40 text-[13px]" />
        )}
        <i
          className={`bx ${abierto ? "bx-chevron-up" : "bx-chevron-down"} text-white/40 text-[16px]`}
        />
      </button>

      {abierto && (
        <div className="px-3 pb-3">
          {/* Filtros de periodo */}
          <div className="flex gap-1 mb-2.5 p-0.5 rounded-lg bg-black/30 ring-1 ring-white/[0.06]">
            {PERIODOS.map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => setPeriodo(p.key)}
                className={`flex-1 text-[10px] font-semibold py-1.5 rounded-md transition-all ${
                  periodo === p.key
                    ? "bg-violet-500/25 text-violet-100 ring-1 ring-violet-400/40"
                    : "text-white/45 hover:text-white/70"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="space-y-1.5">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 bg-white/[0.03]"
                >
                  <span className="w-[19px] h-[29px] rounded-[5px] bg-white/10 animate-pulse shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <span className="block h-2.5 w-2/3 rounded bg-white/10 animate-pulse" />
                    <span className="block h-2 w-1/3 rounded bg-white/[0.07] animate-pulse" />
                  </div>
                  <span className="w-9 h-4 rounded bg-white/10 animate-pulse shrink-0" />
                </div>
              ))}
            </div>
          ) : lista.length === 0 ? (
            <p className="text-[10px] text-white/35 py-1">
              Aún no hay entregas registradas en esta ciudad para{" "}
              {periodoLabel}.
            </p>
          ) : (
            <>
              <div className="space-y-1.5">
                {lista.slice(0, 6).map((t) => {
                  const c = COLORES[t.semaforo] || COLORES.gris;
                  return (
                    <div
                      key={t.transportadora}
                      className="flex items-center gap-2.5 rounded-lg px-2 py-1.5"
                      style={{ background: `rgba(${c.glow},.07)` }}
                    >
                      <MiniSemaforo activo={t.semaforo} />
                      <div className="flex-1 min-w-0">
                        <span className="block text-[11px] font-semibold text-white/90 truncate">
                          {t.transportadora}
                        </span>
                        <span className="block text-[9px] text-white/40">
                          {t.suficiente ? (
                            <>
                              {t.entregadas} entregadas · {t.devoluciones}{" "}
                              devol.
                            </>
                          ) : (
                            <>{t.finalizadas} pedidos finalizados</>
                          )}
                        </span>
                      </div>
                      <div className="text-right shrink-0">
                        {t.suficiente ? (
                          <>
                            <span
                              className="block text-[15px] font-extrabold leading-none tabular-nums"
                              style={{ color: c.text }}
                            >
                              {t.efectividad}%
                            </span>
                            <span
                              className="block text-[8px] font-bold uppercase tracking-wide"
                              style={{ color: c.text }}
                            >
                              {c.label}
                            </span>
                          </>
                        ) : (
                          <span className="text-[9px] text-white/35">
                            pocos datos
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Explicación simple de la fórmula */}
              <p className="mt-2 text-[9px] text-white/35 leading-relaxed">
                <b className="text-white/50">% de entrega</b> = de cada 100
                pedidos que dejaron de estar en camino, cuántos llegaron al
                cliente (entregados vs. devueltos). Verde ≥ 75% · Amarillo
                55–74% · Rojo &lt; 55%.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
