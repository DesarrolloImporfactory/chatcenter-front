import React, { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import chatApi from "../../../../api/chatcenter";

const fmtMoney = (n) =>
  `$${Number(n || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const fmtFecha = (yyyymmdd) => {
  if (!yyyymmdd) return { dia: "—", sem: "—", full: "—" };
  const [y, m, d] = yyyymmdd.split("-");
  const date = new Date(`${yyyymmdd}T12:00:00`);
  const diaSemana = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"][
    date.getDay()
  ];
  return { dia: `${d}/${m}`, sem: diaSemana, full: `${d}/${m}/${y}` };
};

/* ════════════ Tooltip con Portal ════════════ */
const Tip = ({ children, content, maxWidth = 280 }) => {
  const [show, setShow] = useState(false);
  const [coords, setCoords] = useState({ x: 0, y: 0, place: "top" });
  const triggerRef = useRef(null);

  const handleEnter = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const spaceAbove = rect.top;
    const place = spaceAbove < 80 ? "bottom" : "top";
    setCoords({
      x: rect.left + rect.width / 2,
      y: place === "top" ? rect.top : rect.bottom,
      place,
    });
    setShow(true);
  };

  return (
    <>
      <span
        ref={triggerRef}
        className="inline-block"
        onMouseEnter={handleEnter}
        onMouseLeave={() => setShow(false)}
      >
        {children}
      </span>
      {show &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            style={{
              position: "fixed",
              left: coords.x,
              top: coords.y,
              transform:
                coords.place === "top"
                  ? "translate(-50%, calc(-100% - 10px))"
                  : "translate(-50%, 10px)",
              zIndex: 99999,
              pointerEvents: "none",
              maxWidth,
            }}
          >
            <div
              className="px-3 py-2 rounded-lg bg-slate-900 text-white text-[11px] font-normal leading-relaxed shadow-2xl"
              style={{
                boxShadow:
                  "0 10px 25px rgba(0,0,0,0.25), 0 4px 10px rgba(0,0,0,0.15)",
              }}
            >
              {content}
              <span
                style={{
                  position: "absolute",
                  left: "50%",
                  transform: "translateX(-50%)",
                  [coords.place === "top" ? "top" : "bottom"]: "100%",
                  width: 0,
                  height: 0,
                  borderLeft: "6px solid transparent",
                  borderRight: "6px solid transparent",
                  [coords.place === "top" ? "borderTop" : "borderBottom"]:
                    "6px solid #0f172a",
                }}
              />
            </div>
          </div>,
          document.body,
        )}
    </>
  );
};

/* ════════════ Definición de columnas ════════════ */
const COLS = [
  {
    key: "fecha",
    label: "Fecha",
    type: "info",
    tip: "Día al que corresponden los datos. Una fila = un día.",
  },
  {
    key: "gasto_diario",
    label: "Gasto en ads",
    type: "input",
    tip: "Cuánto gastaste hoy en publicidad (Meta + TikTok + Google). Lo escribes tú.",
  },
  {
    key: "num_mensajes",
    label: "Mensajes",
    type: "input",
    tip: "Cuántos mensajes te llegaron por WhatsApp desde los ads de hoy.",
  },
  {
    key: "cost_x_mensaje",
    label: "Costo / Msg",
    type: "formula",
    tip: "Lo que cuesta cada mensaje que llega. Fórmula: Gasto ÷ Mensajes.",
  },
  {
    key: "ordenes_dia",
    label: "Órdenes",
    type: "auto",
    tip: "Total de órdenes generadas en Dropi este día (todos los estados).",
  },
  {
    key: "venta_total",
    label: "Venta total",
    type: "auto",
    tip: "Suma del valor de TODAS las órdenes del día (entregadas + tránsito + canceladas).",
  },
  {
    key: "costo_producto_entregadas",
    label: "Costo prod.",
    type: "auto",
    tip: "Lo que pagaste a Dropi por los productos. SOLO de órdenes ENTREGADAS. Si nada se ha entregado aún, este valor es $0 (todavía no se ha consumido).",
  },
  {
    key: "flete_total",
    label: "Fletes",
    type: "auto",
    tip: "Suma de fletes de TODAS las órdenes del día (incluso las que aún están en tránsito).",
  },
  {
    key: "cancelados",
    label: "Cancel.",
    iconBx: "bx-x-circle",
    iconColor: "text-red-500",
    type: "auto",
    tip: "Órdenes canceladas o devueltas hoy.",
  },
  {
    key: "entregados",
    label: "Entreg.",
    iconBx: "bx-check-circle",
    iconColor: "text-emerald-500",
    type: "auto",
    tip: "Órdenes ENTREGADAS exitosamente al cliente.",
  },
  {
    key: "transito",
    label: "Tránsito",
    iconBx: "bx-package",
    iconColor: "text-sky-500",
    type: "auto",
    tip: "Órdenes en proceso: en bodega, ruta, novedad, retiro en agencia, etc.",
  },
  {
    key: "rentabilidad",
    label: "Rentabilidad",
    type: "formula",
    tip: "Lo que te queda al final del día. Fórmula: Venta total − Costo producto − Fletes − Gasto en ads.",
  },
];

/* ════════════ Componente principal ════════════ */
const DropiDailyMetricsTable = ({ integrationId, dateRange }) => {
  const [rows, setRows] = useState([]);
  const [totales, setTotales] = useState(null);
  const [loading, setLoading] = useState(false);
  const [savingFor, setSavingFor] = useState({});
  const [savedFor, setSavedFor] = useState({});
  const [localEdits, setLocalEdits] = useState({});
  const [showHelp, setShowHelp] = useState(false);
  const debounceTimers = useRef({});

  const cargar = useCallback(async () => {
    if (!integrationId || !dateRange?.from || !dateRange?.until) return;
    setLoading(true);
    try {
      const res = await chatApi.post(
        "dropi_integrations/dashboard/daily-metrics",
        {
          integration_id: integrationId,
          from: dateRange.from,
          until: dateRange.until,
        },
        { timeout: 30000 },
      );
      if (res.data?.data) {
        setRows(res.data.data.rows || []);
        setTotales(res.data.data.totales || null);
      }
    } catch (err) {
      console.error("[daily-metrics] Error:", err?.message);
    } finally {
      setLoading(false);
    }
  }, [integrationId, dateRange]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  useEffect(() => {
    setLocalEdits({});
  }, [rows]);

  const guardar = useCallback(
    async (fecha, gasto_diario, num_mensajes) => {
      try {
        setSavingFor((p) => ({ ...p, [fecha]: true }));
        await chatApi.put("dropi_integrations/dashboard/daily-metrics", {
          integration_id: integrationId,
          fecha,
          gasto_diario,
          num_mensajes,
        });
        setSavedFor((p) => ({ ...p, [fecha]: true }));
        setTimeout(() => setSavedFor((p) => ({ ...p, [fecha]: false })), 1500);
        cargar();
      } catch (err) {
        console.error("[daily-metrics] Save error:", err?.message);
      } finally {
        setSavingFor((p) => ({ ...p, [fecha]: false }));
      }
    },
    [integrationId, cargar],
  );

  const onChangeField = (fecha, field, valor, currentRow) => {
    setLocalEdits((p) => ({
      ...p,
      [fecha]: { ...(p[fecha] || {}), [field]: valor },
    }));
    if (debounceTimers.current[fecha]) {
      clearTimeout(debounceTimers.current[fecha]);
    }
    debounceTimers.current[fecha] = setTimeout(() => {
      const merged = {
        gasto_diario: currentRow.gasto_diario,
        num_mensajes: currentRow.num_mensajes,
        ...(localEdits[fecha] || {}),
        [field]: valor,
      };
      guardar(
        fecha,
        Number(merged.gasto_diario) || 0,
        Number(merged.num_mensajes) || 0,
      );
    }, 800);
  };

  const getValor = (fecha, field, fallback) => {
    if (localEdits[fecha]?.[field] !== undefined)
      return localEdits[fecha][field];
    return fallback;
  };

  const tieneFilas = rows.length > 0;
  if (!integrationId) return null;

  return (
    <div className="mb-4 rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
      {/* ═══════ HEADER ═══════ */}
      <div className="relative bg-gradient-to-r from-indigo-700 via-violet-600 to-fuchsia-600 px-5 py-4">
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              "radial-gradient(circle at 2px 2px, white 1px, transparent 0)",
            backgroundSize: "20px 20px",
          }}
        />
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <i className="bx bx-line-chart text-white text-xl" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white leading-tight">
                Métricas diarias del negocio
              </h3>
              <p className="text-[11px] text-violet-100 mt-0.5">
                Tu gasto en ads + las ventas reales de Dropi → rentabilidad por
                día
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowHelp(!showHelp)}
            className="flex items-center gap-1.5 bg-white/15 hover:bg-white/25 backdrop-blur-sm border border-white/20 rounded-lg px-3 py-1.5 text-[11px] text-white font-semibold transition"
          >
            <i className="bx bx-help-circle text-sm" />
            {showHelp ? "Ocultar guía" : "¿Cómo se calcula?"}
          </button>
        </div>
      </div>

      {/* ═══════ HELP EXPANDIBLE ═══════ */}
      {showHelp && (
        <div className="bg-gradient-to-r from-indigo-50 to-violet-50 border-b border-indigo-100 px-5 py-4">
          <div className="grid md:grid-cols-3 gap-3 mb-3">
            <HelpCard
              color="indigo"
              iconBx="bx-edit-alt"
              title="Tú lo escribes"
              cols={["Gasto en ads", "Mensajes"]}
              desc="Datos que solo tú conoces. Edita los inputs en cada fila — se guardan solos."
            />
            <HelpCard
              color="slate"
              iconBx="bx-cloud-download"
              title="Lo trae Dropi"
              cols={["Órdenes", "Venta", "Costo prod.", "Fletes", "Estados"]}
              desc="Sincronizado en tiempo real desde tu cuenta Dropi. No editable."
            />
            <HelpCard
              color="violet"
              iconBx="bx-calculator"
              title="Calculado"
              cols={["Costo / Msg", "Rentabilidad"]}
              desc="Fórmulas automáticas. Cambian al editar gasto o mensajes."
            />
          </div>

          <div className="bg-white border border-indigo-200 rounded-lg p-3 mt-2">
            <div className="flex items-center gap-2 mb-2">
              <i className="bx bx-math text-violet-600" />
              <span className="text-[10px] font-bold text-violet-700 uppercase tracking-wide">
                Fórmula de Rentabilidad
              </span>
            </div>
            <div className="font-mono text-[12px] text-slate-700 leading-relaxed">
              <span className="text-emerald-700 font-bold">Rentabilidad</span> ={" "}
              <span className="bg-slate-100 px-1.5 py-0.5 rounded">
                Venta total
              </span>{" "}
              −{" "}
              <span className="bg-slate-100 px-1.5 py-0.5 rounded">
                Costo producto
              </span>{" "}
              −{" "}
              <span className="bg-slate-100 px-1.5 py-0.5 rounded">Fletes</span>{" "}
              −{" "}
              <span className="bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded">
                Gasto en ads
              </span>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mt-2 flex gap-2.5">
            <i className="bx bx-info-circle text-amber-600 text-base shrink-0 mt-0.5" />
            <p className="text-[11px] text-amber-900 leading-snug">
              <strong>Días con etiqueta "PROV":</strong> aún no hay entregas ese
              día, todas las órdenes están en tránsito. La rentabilidad va a
              bajar cuando se entreguen (porque ahí se cuenta el costo del
              producto). Es info temporal, espera unos días para ver el número
              real.
            </p>
          </div>
        </div>
      )}

      {/* ═══════ STATES ═══════ */}
      {loading && !tieneFilas && (
        <div className="px-5 py-12 text-center">
          <div className="inline-flex flex-col items-center gap-2">
            <i className="bx bx-loader-alt bx-spin text-violet-500 text-2xl" />
            <span className="text-xs text-slate-500">Cargando métricas...</span>
          </div>
        </div>
      )}

      {!loading && !tieneFilas && (
        <div className="px-5 py-12 text-center">
          <i className="bx bx-table text-slate-300 text-4xl mb-2 block" />
          <p className="text-sm font-semibold text-slate-600 mb-1">
            Sin datos en este rango
          </p>
          <p className="text-xs text-slate-400">
            Selecciona un rango con órdenes de Dropi.
          </p>
        </div>
      )}

      {/* ═══════ TABLA ═══════ */}
      {tieneFilas && (
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="bg-slate-50 border-b-2 border-slate-200">
                {COLS.map((col) => (
                  <th
                    key={col.key}
                    className={`px-2.5 py-2.5 text-left font-bold ${
                      col.type === "input"
                        ? "bg-indigo-50/70 text-indigo-800"
                        : col.type === "formula"
                          ? "bg-violet-50/70 text-violet-800"
                          : "text-slate-700"
                    }`}
                  >
                    <Tip content={col.tip}>
                      <span className="inline-flex items-center gap-1.5 cursor-help text-[10px] uppercase tracking-wide">
                        {col.type === "input" && (
                          <i
                            className="bx bx-edit-alt text-indigo-500"
                            style={{ fontSize: 11 }}
                          />
                        )}
                        {col.type === "formula" && (
                          <i
                            className="bx bx-calculator text-violet-500"
                            style={{ fontSize: 11 }}
                          />
                        )}
                        {col.iconBx && (
                          <i
                            className={`bx ${col.iconBx} ${col.iconColor || "text-slate-500"}`}
                            style={{ fontSize: 12 }}
                          />
                        )}
                        {col.label}
                        <i
                          className="bx bx-info-circle text-slate-300"
                          style={{ fontSize: 10 }}
                        />
                      </span>
                    </Tip>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, idx) => {
                const isEven = idx % 2 === 0;
                const rentNeg = r.rentabilidad < 0;
                const saving = savingFor[r.fecha];
                const saved = savedFor[r.fecha];
                const gastoVal = getValor(
                  r.fecha,
                  "gasto_diario",
                  r.gasto_diario,
                );
                const msgVal = getValor(
                  r.fecha,
                  "num_mensajes",
                  r.num_mensajes,
                );
                const fechaInfo = fmtFecha(r.fecha);

                const todoEnTransito =
                  r.entregados === 0 && r.transito > 0 && r.ordenes_dia > 0;

                return (
                  <tr
                    key={r.fecha}
                    className={`border-b border-slate-100 hover:bg-violet-50/40 transition ${
                      isEven ? "bg-white" : "bg-slate-50/40"
                    }`}
                  >
                    {/* Fecha */}
                    <Td>
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-800">
                          {fechaInfo.dia}
                        </span>
                        <span className="text-[9px] text-slate-400 uppercase tracking-wide">
                          {fechaInfo.sem}
                        </span>
                      </div>
                    </Td>

                    {/* Gasto */}
                    <Td className="bg-indigo-50/30">
                      <div className="relative inline-block">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] pointer-events-none">
                          $
                        </span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={gastoVal}
                          onChange={(e) =>
                            onChangeField(
                              r.fecha,
                              "gasto_diario",
                              e.target.value,
                              r,
                            )
                          }
                          className="w-24 pl-5 pr-2 py-1.5 rounded-md border border-indigo-200 bg-white text-[11px] text-right font-semibold focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition"
                          placeholder="0.00"
                        />
                        {(saving || saved) && (
                          <span className="absolute -right-5 top-1/2 -translate-y-1/2">
                            {saving ? (
                              <i className="bx bx-loader-alt bx-spin text-indigo-500 text-xs" />
                            ) : (
                              <i className="bx bx-check text-emerald-500 text-sm" />
                            )}
                          </span>
                        )}
                      </div>
                    </Td>

                    {/* Mensajes */}
                    <Td className="bg-indigo-50/30">
                      <input
                        type="number"
                        min="0"
                        value={msgVal}
                        onChange={(e) =>
                          onChangeField(
                            r.fecha,
                            "num_mensajes",
                            e.target.value,
                            r,
                          )
                        }
                        className="w-16 px-2 py-1.5 rounded-md border border-indigo-200 bg-white text-[11px] text-right font-semibold focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition"
                        placeholder="0"
                      />
                    </Td>

                    {/* Cost x Msg */}
                    <Td className="bg-violet-50/40">
                      <Tip
                        content={
                          r.cost_x_mensaje > 0
                            ? `${fmtMoney(gastoVal)} ÷ ${msgVal} mensajes`
                            : "Sin mensajes registrados aún"
                        }
                      >
                        <span className="font-mono font-bold text-violet-700 cursor-help">
                          {r.cost_x_mensaje > 0
                            ? `$${r.cost_x_mensaje.toFixed(3)}`
                            : "—"}
                        </span>
                      </Tip>
                    </Td>

                    {/* Órdenes */}
                    <Td className="font-bold text-slate-800 text-center">
                      {r.ordenes_dia}
                    </Td>

                    {/* Venta */}
                    <Td className="text-slate-700 font-semibold">
                      {fmtMoney(r.venta_total)}
                    </Td>

                    {/* Costo producto */}
                    <Td>
                      {r.costo_producto_entregadas > 0 ? (
                        <span className="text-slate-700">
                          {fmtMoney(r.costo_producto_entregadas)}
                        </span>
                      ) : r.entregados === 0 && r.ordenes_dia > 0 ? (
                        <Tip content="Aún no hay órdenes entregadas. Cuando se entreguen, aquí aparecerá su costo.">
                          <span className="text-slate-400 italic cursor-help inline-flex items-center gap-1">
                            <i className="bx bx-time text-[11px]" />
                            pendiente
                          </span>
                        </Tip>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </Td>

                    {/* Fletes */}
                    <Td className="text-slate-600">
                      {fmtMoney(r.flete_total)}
                    </Td>

                    {/* Cancelados */}
                    <Td className="text-center">
                      {r.cancelados > 0 ? (
                        <span className="inline-flex items-center justify-center min-w-[22px] h-5 px-1.5 rounded bg-red-50 text-red-700 font-bold text-[10px]">
                          {r.cancelados}
                        </span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </Td>

                    {/* Entregados */}
                    <Td className="text-center">
                      {r.entregados > 0 ? (
                        <span className="inline-flex items-center justify-center min-w-[22px] h-5 px-1.5 rounded bg-emerald-50 text-emerald-700 font-bold text-[10px]">
                          {r.entregados}
                        </span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </Td>

                    {/* Tránsito */}
                    <Td className="text-center">
                      {r.transito > 0 ? (
                        <span className="inline-flex items-center justify-center min-w-[22px] h-5 px-1.5 rounded bg-sky-50 text-sky-700 font-bold text-[10px]">
                          {r.transito}
                        </span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </Td>

                    {/* Rentabilidad */}
                    <Td>
                      <Tip
                        content={
                          <span>
                            <strong>{fmtMoney(r.venta_total)}</strong> −{" "}
                            <strong>
                              {fmtMoney(r.costo_producto_entregadas)}
                            </strong>{" "}
                            − <strong>{fmtMoney(r.flete_total)}</strong> −{" "}
                            <strong>{fmtMoney(gastoVal)}</strong> ={" "}
                            <strong className="text-emerald-300">
                              {fmtMoney(r.rentabilidad)}
                            </strong>
                            {todoEnTransito && (
                              <>
                                <br />
                                <span className="text-amber-300 text-[10px] inline-flex items-center gap-1 mt-1">
                                  <i className="bx bx-error-circle" />
                                  Provisional: aún no hay entregas
                                </span>
                              </>
                            )}
                          </span>
                        }
                      >
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-md font-bold cursor-help ${
                            rentNeg
                              ? "bg-red-100 text-red-700"
                              : todoEnTransito
                                ? "bg-amber-100 text-amber-800 border border-amber-300"
                                : "bg-emerald-100 text-emerald-800"
                          }`}
                        >
                          {fmtMoney(r.rentabilidad)}
                          {todoEnTransito && (
                            <span className="text-[8px] font-bold uppercase tracking-wide">
                              prov
                            </span>
                          )}
                        </span>
                      </Tip>
                    </Td>
                  </tr>
                );
              })}
            </tbody>

            {/* TOTALES */}
            {totales && (
              <tfoot>
                <tr className="bg-gradient-to-r from-slate-100 to-slate-50 border-t-2 border-slate-300 font-extrabold">
                  <Td className="text-slate-900 uppercase text-[10px] tracking-widest">
                    TOTAL
                  </Td>
                  <Td className="text-indigo-700 bg-indigo-50/50">
                    {fmtMoney(totales.gasto_diario)}
                  </Td>
                  <Td className="text-indigo-700 bg-indigo-50/50">
                    {totales.num_mensajes}
                  </Td>
                  <Td className="text-violet-700 bg-violet-50/50 font-mono">
                    {totales.cost_x_mensaje > 0
                      ? `$${totales.cost_x_mensaje.toFixed(3)}`
                      : "—"}
                  </Td>
                  <Td className="text-slate-900 text-center">
                    {totales.ordenes_dia}
                  </Td>
                  <Td className="text-slate-900">
                    {fmtMoney(totales.venta_total)}
                  </Td>
                  <Td className="text-slate-700">
                    {fmtMoney(totales.costo_producto_entregadas)}
                  </Td>
                  <Td className="text-slate-700">
                    {fmtMoney(totales.flete_total)}
                  </Td>
                  <Td className="text-red-700 text-center">
                    {totales.cancelados}
                  </Td>
                  <Td className="text-emerald-700 text-center">
                    {totales.entregados}
                  </Td>
                  <Td className="text-sky-700 text-center">
                    {totales.transito}
                  </Td>
                  <Td>
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-md font-extrabold ${
                        totales.rentabilidad < 0
                          ? "bg-red-200 text-red-800"
                          : "bg-emerald-200 text-emerald-800"
                      }`}
                    >
                      {fmtMoney(totales.rentabilidad)}
                    </span>
                  </Td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}
    </div>
  );
};

/* ════════════ Subcomponentes ════════════ */
const HelpCard = ({ color, iconBx, title, cols, desc }) => {
  const colors = {
    indigo: {
      bg: "bg-indigo-100",
      text: "text-indigo-700",
      chip: "bg-indigo-200 text-indigo-800",
    },
    slate: {
      bg: "bg-slate-100",
      text: "text-slate-700",
      chip: "bg-slate-200 text-slate-800",
    },
    violet: {
      bg: "bg-violet-100",
      text: "text-violet-700",
      chip: "bg-violet-200 text-violet-800",
    },
  };
  const c = colors[color];
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-3">
      <div className="flex items-center gap-2 mb-1.5">
        <div
          className={`w-7 h-7 rounded-md ${c.bg} flex items-center justify-center`}
        >
          <i className={`bx ${iconBx} ${c.text} text-base`} />
        </div>
        <span className={`text-xs font-bold ${c.text}`}>{title}</span>
      </div>
      <div className="flex flex-wrap gap-1 mb-2">
        {cols.map((col) => (
          <span
            key={col}
            className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${c.chip}`}
          >
            {col}
          </span>
        ))}
      </div>
      <p className="text-[10px] text-slate-600 leading-snug">{desc}</p>
    </div>
  );
};

const Td = ({ children, className = "" }) => (
  <td className={`px-2.5 py-2 whitespace-nowrap ${className}`}>{children}</td>
);

export default DropiDailyMetricsTable;
