import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import chatApi from "../../../../api/chatcenter";
import Section from "../shared/Section";
import { Kpi } from "./IngresosKpis";
import DrawerDetalle from "../../usuarios/DrawerDetalle";
import { money0, money2, num, pct1 } from "../utils";

// Fechas en hora local (YYYY-MM-DD), igual que el back (America/Guayaquil)
const ymd = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const haceDias = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
};

const PRESETS = [
  { id: "7", label: "Últimos 7 días", rango: () => [haceDias(6), new Date()] },
  { id: "14", label: "Últimas 2 semanas", rango: () => [haceDias(13), new Date()] },
  { id: "21", label: "Últimas 3 semanas", rango: () => [haceDias(20), new Date()] },
  { id: "28", label: "Últimas 4 semanas", rango: () => [haceDias(27), new Date()] },
  {
    id: "mes",
    label: "Este mes",
    rango: () => {
      const h = new Date();
      return [new Date(h.getFullYear(), h.getMonth(), 1), h];
    },
  },
  {
    id: "mes_ant",
    label: "Mes pasado",
    rango: () => {
      const h = new Date();
      return [
        new Date(h.getFullYear(), h.getMonth() - 1, 1),
        new Date(h.getFullYear(), h.getMonth(), 0),
      ];
    },
  },
  { id: "90", label: "Últimos 90 días", rango: () => [haceDias(89), new Date()] },
  {
    id: "anio",
    label: "Este año",
    rango: () => [new Date(new Date().getFullYear(), 0, 1), new Date()],
  },
];

const ESTADOS = {
  cobrado: { label: "Cobrado", cls: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  failed: { label: "Fallido", cls: "bg-rose-50 text-rose-700 ring-rose-200" },
  pending: { label: "Pendiente", cls: "bg-amber-50 text-amber-700 ring-amber-200" },
  reembolsado: { label: "Reembolsado", cls: "bg-slate-100 text-slate-700 ring-slate-200" },
  reembolso_parcial: { label: "Reembolso parcial", cls: "bg-slate-100 text-slate-700 ring-slate-200" },
  disputa: { label: "Disputa", cls: "bg-violet-50 text-violet-700 ring-violet-200" },
};

const FACTURA = {
  paid: "Recuperada",
  open: "Sigue abierta",
  uncollectible: "Incobrable",
  void: "Anulada",
};

// "19 oct 2026" para las fechas de cancelación programada.
const fechaCorta = (iso) =>
  new Date(iso).toLocaleDateString("es-EC", { day: "2-digit", month: "short", year: "numeric" });

const SUB_STATUS = {
  active: { label: "Sub activa", cls: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  trialing: { label: "En prueba", cls: "bg-cyan-50 text-cyan-700 ring-cyan-200" },
  past_due: { label: "Renovación vencida", cls: "bg-amber-50 text-amber-700 ring-amber-200" },
  unpaid: { label: "Impaga", cls: "bg-amber-50 text-amber-700 ring-amber-200" },
  canceled: { label: "Sub cancelada", cls: "bg-rose-50 text-rose-700 ring-rose-200" },
};

// Enlaces directos al dashboard de Stripe (modo test lleva prefijo /test)
const stripeUrl = (modo, tipo, id) =>
  `https://dashboard.stripe.com/${modo === "test" ? "test/" : ""}${tipo}/${id}`;

function StripeLink({ modo, tipo, id, children }) {
  if (!id) return null;
  return (
    <a
      href={stripeUrl(modo, tipo, id)}
      target="_blank"
      rel="noreferrer"
      title="Abrir en Stripe"
      className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-cyan-700 whitespace-nowrap"
    >
      {children || "Stripe"} <i className="bx bx-link-external" />
    </a>
  );
}

const FILTROS = [
  { id: "todos", label: "Todos" },
  { id: "cobrado", label: "Cobrados" },
  { id: "failed", label: "Fallidos" },
  { id: "otros", label: "Reembolsos / disputas" },
];

const fmtFechaHora = (iso) =>
  new Date(iso).toLocaleString("es-EC", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

const lunesDe = (yyyymmdd) => {
  const d = new Date(`${yyyymmdd}T12:00:00`);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return ymd(d);
};

function ChartTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white rounded-lg shadow-lg ring-1 ring-slate-200 p-3 text-xs space-y-0.5">
      <div className="font-bold text-slate-900 mb-1">{d.label}</div>
      <div className="text-emerald-700">
        Cobrado: <b>{money2(d.cobrado)}</b> ({num(d.n_ok)})
      </div>
      <div className="text-rose-600">
        Intentos fallidos: <b>{money2(d.fallido)}</b> ({num(d.n_fail)})
      </div>
      {d.reembolsado > 0 && (
        <div className="text-slate-600">
          Reembolsado: <b>{money2(d.reembolsado)}</b>
        </div>
      )}
    </div>
  );
}

function aCsv(rows) {
  const cols = [
    ["fecha", "Fecha"],
    ["estado", "Estado"],
    ["monto", "Monto"],
    ["comision", "Comisión"],
    ["reembolsado", "Reembolsado"],
    ["neto", "Neto"],
    ["moneda", "Moneda"],
    ["empresa", "Empresa"],
    ["cliente_email", "Email"],
    ["motivo", "Motivo"],
    ["tarjeta", "Tarjeta"],
    ["invoice_id", "Factura"],
    ["id", "Cobro"],
  ];
  const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  return [
    cols.map(([, h]) => esc(h)).join(","),
    ...rows.map((r) => cols.map(([k]) => esc(r[k])).join(",")),
  ].join("\n");
}

export default function CobrosTab() {
  const [preset, setPreset] = useState("28");
  const [desde, setDesde] = useState(ymd(haceDias(27)));
  const [hasta, setHasta] = useState(ymd(new Date()));
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filtro, setFiltro] = useState("todos");
  const [busqueda, setBusqueda] = useState("");
  const [verTodos, setVerTodos] = useState(false);
  const [detalle, setDetalle] = useState({ open: false, loading: false, data: null });

  const cargar = useCallback(
    async (fresh = false) => {
      setLoading(true);
      try {
        const { data: r } = await chatApi.get("admin_dashboard/cobros", {
          params: { desde, hasta, ...(fresh ? { fresh: 1 } : {}) },
        });
        setData(r.data);
      } catch (e) {
        toast.error(e?.response?.data?.message || "No se pudieron cargar los cobros");
      } finally {
        setLoading(false);
      }
    },
    [desde, hasta],
  );

  useEffect(() => {
    cargar();
  }, [cargar]);

  const aplicarPreset = (id) => {
    const p = PRESETS.find((x) => x.id === id);
    setPreset(id);
    if (!p) return;
    const [a, b] = p.rango();
    setDesde(ymd(a));
    setHasta(ymd(b));
  };

  const abrirDetalle = async (id_usuario) => {
    if (!id_usuario) return;
    setDetalle({ open: true, loading: true, data: null });
    try {
      const { data: r } = await chatApi.get(`admin_usuarios/detalle/${id_usuario}`, { silentError: true });
      setDetalle({ open: true, loading: false, data: r.data });
    } catch (e) {
      // Finanzas ve el tablero pero no el Panel de usuarios
      toast.error(
        e?.response?.status === 403
          ? "El detalle del cliente es del Panel de usuarios: no tienes acceso."
          : "No se pudo cargar el detalle",
      );
      setDetalle({ open: false, loading: false, data: null });
    }
  };

  // Más de ~45 días se agrupa por semana para que el gráfico sea legible
  const serie = useMemo(() => {
    if (!data) return [];
    const dias = data.por_dia;
    const porSemana = dias.length > 45;
    const map = new Map();
    for (const d of dias) {
      const key = porSemana ? lunesDe(d.fecha) : d.fecha;
      const acc = map.get(key) || {
        key,
        cobrado: 0,
        fallido: 0,
        reembolsado: 0,
        n_ok: 0,
        n_fail: 0,
      };
      acc.cobrado += d.cobrado;
      acc.fallido += d.fallido;
      acc.reembolsado += d.reembolsado;
      acc.n_ok += d.n_ok;
      acc.n_fail += d.n_fail;
      map.set(key, acc);
    }
    return [...map.values()]
      .sort((a, b) => a.key.localeCompare(b.key))
      .map((x) => {
        const f = new Date(`${x.key}T12:00:00`).toLocaleDateString("es-EC", {
          day: "2-digit",
          month: "short",
        });
        return { ...x, eje: f, label: porSemana ? `Semana del ${f}` : f };
      });
  }, [data]);

  const filas = useMemo(() => {
    if (!data) return [];
    const q = busqueda.trim().toLowerCase();
    return data.cobros.filter((c) => {
      if (filtro === "cobrado" && c.estado !== "cobrado") return false;
      if (filtro === "failed" && c.estado !== "failed") return false;
      if (
        filtro === "otros" &&
        !["reembolsado", "reembolso_parcial", "disputa"].includes(c.estado)
      )
        return false;
      if (!q) return true;
      return [c.empresa, c.cliente_email, c.cliente_nombre, c.invoice_id, c.id]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
  }, [data, filtro, busqueda]);

  // Totales de lo que se está viendo (filtro + búsqueda), para no sumar a ojo
  const totalesFiltro = useMemo(
    () =>
      filas.reduce(
        (acc, c) => {
          if (c.estado === "failed") acc.fallido += c.monto;
          else if (c.estado !== "pending") {
            acc.cobrado += c.monto;
            acc.neto += c.neto;
          }
          return acc;
        },
        { cobrado: 0, neto: 0, fallido: 0 },
      ),
    [filas],
  );

  const descargarCsv = () => {
    const blob = new Blob(["﻿" + aCsv(filas)], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `cobros_${desde}_a_${hasta}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const k = data?.kpis;
  const visibles = verTodos ? filas : filas.slice(0, 100);

  return (
    <div className="space-y-6">
      {/* Selector de rango */}
      <div className="bg-white rounded-xl border border-slate-200 px-4 py-3 flex items-center gap-3 flex-wrap shadow-sm">
        <i className="bx bx-calendar text-cyan-700 text-xl" />
        <div className="flex flex-wrap gap-1.5">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              onClick={() => aplicarPreset(p.id)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold ring-1 transition ${
                preset === p.id
                  ? "bg-slate-900 text-white ring-slate-900"
                  : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-100"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 ml-auto text-sm">
          <input
            type="date"
            value={desde}
            max={hasta}
            onChange={(e) => {
              setPreset("custom");
              setDesde(e.target.value);
            }}
            className="px-2 py-1 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-cyan-500"
          />
          <span className="text-slate-400">a</span>
          <input
            type="date"
            value={hasta}
            min={desde}
            onChange={(e) => {
              setPreset("custom");
              setHasta(e.target.value);
            }}
            className="px-2 py-1 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-cyan-500"
          />
          <button
            onClick={() => cargar(true)}
            disabled={loading}
            title="Volver a consultar Stripe (ignora la caché de 5 min)"
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-900 text-white font-semibold text-xs hover:bg-slate-800 disabled:opacity-50"
          >
            <i className={`bx ${loading ? "bx-loader-alt bx-spin" : "bx-refresh"}`} />
            Actualizar
          </button>
        </div>
      </div>

      {loading && !data && (
        <div className="py-16 text-center text-slate-500">
          <i className="bx bx-loader-alt bx-spin text-4xl text-cyan-600" />
          <p className="mt-2 text-sm">Consultando Stripe… puede tardar unos segundos</p>
        </div>
      )}

      {data && (
        <div className={`space-y-6 ${loading ? "opacity-60 pointer-events-none" : ""}`}>
          {data.monedas.length > 1 && (
            <div className="text-xs bg-amber-50 text-amber-800 ring-1 ring-amber-200 rounded-lg px-3 py-2">
              Hay cobros en varias monedas ({data.monedas.join(", ")}): los totales las suman sin convertir.
            </div>
          )}
          {data.truncado && (
            <div className="text-xs bg-amber-50 text-amber-800 ring-1 ring-amber-200 rounded-lg px-3 py-2">
              El rango tiene demasiados cobros y se muestran solo los primeros 5.000. Usa un rango más corto.
            </div>
          )}

          {/* Alertas que ya costaron dinero (12-10-2026: 10 clientes con dos
              subs y $150 cobrados dos veces). No dependen del rango. */}
          {(data.alertas?.dobles?.length > 0 || data.alertas?.dobles_programadas?.length > 0 || k.pendiente_muerto_facturas > 0) && (
            <Section
              icon="bx-shield-x"
              title="Alertas"
              subtitle="Situaciones que hay que corregir a mano en Stripe. Si están aquí, le estamos cobrando mal a alguien o contando deuda que no existe."
            >
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {data.alertas?.dobles?.length > 0 && (
                  <div className="bg-white rounded-xl border border-rose-200 p-4 shadow-sm">
                    <div className="flex items-start gap-2 mb-3">
                      <i className="bx bx-copy-alt text-rose-600 text-xl" />
                      <div>
                        <div className="text-sm font-bold text-slate-900">
                          {num(data.alertas.dobles.length)} cliente
                          {data.alertas.dobles.length === 1 ? "" : "s"} con dos suscripciones vivas
                        </div>
                        <p className="text-xs text-slate-500">
                          Casi siempre: la renovación rebotó, volvió a contratar por checkout y la
                          vieja siguió viva. Hay que cancelar la sobrante y anular su factura
                          abierta (o correr <code className="text-[11px]">scripts/repararDobleCobroCheckout.js</code>).
                        </p>
                      </div>
                    </div>
                    <ul className="divide-y divide-slate-100">
                      {data.alertas.dobles.map((d) => (
                        <li key={d.customer_id} className="py-2 text-xs">
                          <div className="flex items-center justify-between gap-2">
                            {d.id_usuario ? (
                              <button
                                onClick={() => abrirDetalle(d.id_usuario)}
                                className="font-semibold text-slate-900 hover:text-cyan-700 text-left"
                              >
                                {d.empresa || d.cliente_email || d.customer_id}
                              </button>
                            ) : (
                              <span className="font-semibold text-slate-700">{d.customer_id}</span>
                            )}
                            <StripeLink modo={data.modo} tipo="customers" id={d.customer_id} />
                          </div>
                          {d.cliente_email && <div className="text-slate-500">{d.cliente_email}</div>}
                          <ul className="mt-1 space-y-0.5">
                            {d.subs.map((s) => {
                              const st = SUB_STATUS[s.status] || { label: s.status, cls: "bg-slate-100 text-slate-700 ring-slate-200" };
                              const esLaDeBd = s.id === d.sub_en_bd;
                              return (
                                <li key={s.id} className="flex items-center gap-2 flex-wrap">
                                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ring-1 ${st.cls}`}>{st.label}</span>
                                  <span className="text-slate-700">{s.producto || "—"} · {money2(s.monto)}</span>
                                  <span className="text-slate-400">desde {new Date(s.creada).toLocaleDateString("es-EC", { day: "2-digit", month: "short", year: "numeric" })}</span>
                                  {esLaDeBd && <span className="text-[10px] font-bold text-cyan-700">la de la BD</span>}
                                  {s.reemplazada_por && !s.termina && <span className="text-[10px] font-bold text-rose-600">reemplazada → sobrante, hay que cancelarla</span>}
                                  {s.reemplazada_por && s.termina && <span className="text-[10px] font-bold text-slate-500">reemplazada</span>}
                                  {s.termina && <span className="text-[10px] text-slate-500">se cancela el {fechaCorta(s.termina)}</span>}
                                  <StripeLink modo={data.modo} tipo="subscriptions" id={s.id} />
                                </li>
                              );
                            })}
                          </ul>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {data.alertas?.dobles_programadas?.length > 0 && (
                  <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                    <div className="flex items-start gap-2 mb-3">
                      <i className="bx bx-check-shield text-slate-500 text-xl" />
                      <div>
                        <div className="text-sm font-bold text-slate-900">
                          {num(data.alertas.dobles_programadas.length)} cliente
                          {data.alertas.dobles_programadas.length === 1 ? "" : "s"} con una suscripción sobrante ya programada para cancelarse
                        </div>
                        <p className="text-xs text-slate-500">
                          Volvieron a contratar por checkout y la vieja quedó con fecha de fin: Stripe la cancela
                          sola al cerrar el periodo y no genera otra factura. No hay nada que hacer.
                        </p>
                      </div>
                    </div>
                    <ul className="divide-y divide-slate-100">
                      {data.alertas.dobles_programadas.map((d) => (
                        <li key={d.customer_id} className="py-2 text-xs">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold text-slate-800">{d.empresa || d.cliente_email || d.customer_id}</span>
                            <StripeLink modo={data.modo} tipo="customers" id={d.customer_id} />
                          </div>
                          <ul className="mt-1 space-y-0.5">
                            {d.subs.map((s) => (
                              <li key={s.id} className="flex items-center gap-2 flex-wrap text-slate-600">
                                <span>{s.producto || "—"} · {money2(s.monto)}</span>
                                {s.id === d.sub_en_bd && <span className="text-[10px] font-bold text-cyan-700">la de la BD</span>}
                                {s.termina && <span className="text-[10px] text-slate-500">se cancela el {fechaCorta(s.termina)}</span>}
                                <StripeLink modo={data.modo} tipo="subscriptions" id={s.id} />
                              </li>
                            ))}
                          </ul>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {k.pendiente_muerto_facturas > 0 && (
                  <div className="bg-white rounded-xl border border-amber-200 p-4 shadow-sm">
                    <div className="flex items-start gap-2">
                      <i className="bx bx-receipt text-amber-600 text-xl" />
                      <div>
                        <div className="text-sm font-bold text-slate-900">
                          {money2(k.pendiente_muerto)} en {num(k.pendiente_muerto_facturas)} factura
                          {k.pendiente_muerto_facturas === 1 ? "" : "s"} abierta
                          {k.pendiente_muerto_facturas === 1 ? "" : "s"} de suscripciones canceladas
                        </div>
                        <p className="text-xs text-slate-500">
                          Nadie las va a pagar solas: la suscripción ya no existe. Inflan el
                          "pendiente de cobro" y, si el cliente vuelve con tarjeta nueva, Stripe
                          puede cobrarlas. Anularlas en Stripe (void). Están marcadas en rojo en la
                          tabla de facturas abiertas.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </Section>
          )}

          <Section
            icon="bx-wallet"
            title="Lo que realmente entró"
            subtitle="Cobros con estado exitoso en Stripe dentro del rango. Lo que viste en el MRR solo es dinero si aparece aquí."
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <Kpi
                accent="emerald"
                icon="bx-check-circle"
                label="Cobrado (bruto)"
                value={money2(k.bruto)}
                hint={`${num(k.cobros_ok)} cobros exitosos`}
                explain="Suma de los cobros que Stripe aprobó en el rango, antes de comisiones."
              />
              <Kpi
                accent="cyan"
                icon="bx-bank"
                label="Neto para ti"
                value={money2(k.neto)}
                hint={`Comisión Stripe: ${money2(k.comisiones)}`}
                explain="Bruto menos la comisión de Stripe y lo reembolsado. Es lo que llega a tu cuenta (aprox.)."
              />
              <Kpi
                accent="violet"
                icon="bx-undo"
                label="Reembolsos y disputas"
                value={money2(k.reembolsado + k.monto_disputas)}
                hint={`${money2(k.reembolsado)} reembolsado · ${num(k.disputas)} disputas`}
                explain="Dinero cobrado que se devolvió o que un cliente reclamó con su banco (contracargo)."
              />
              <Kpi
                accent="amber"
                icon="bx-pie-chart-alt"
                label="Tasa de éxito"
                value={pct1(k.tasa_exito)}
                hint={`${num(k.cobros_ok)} de ${num(k.cobros_ok + k.intentos_fallidos)} intentos`}
                explain="Porcentaje de intentos de cobro aprobados. Baja mucho porque Stripe reintenta varias veces la misma factura."
              />
            </div>
          </Section>

          <Section
            icon="bx-error-circle"
            title="Lo que no se pudo cobrar"
            subtitle="Fallos por tarjeta (fondos, rechazos, vencidas). Se agrupan por factura para no contar 4 veces la misma deuda."
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <Kpi
                accent="rose"
                icon="bx-x-circle"
                label="Facturas con fallo"
                value={num(k.facturas_fallidas)}
                hint={`${num(k.clientes_con_fallo)} clientes · ${num(k.intentos_fallidos)} intentos`}
                explain="Facturas que tuvieron al menos un intento fallido dentro del rango."
              />
              <Kpi
                accent="emerald"
                icon="bx-revision"
                label="Recuperadas"
                value={num(k.facturas_recuperadas)}
                hint={
                  k.facturas_fallidas
                    ? `${pct1((k.facturas_recuperadas / k.facturas_fallidas) * 100)} de las fallidas`
                    : null
                }
                explain="Facturas que fallaron pero luego se pagaron (reintento de Stripe o el cliente cambió tarjeta)."
              />
              <Kpi
                accent="rose"
                icon="bx-money-withdraw"
                label="Sin recuperar"
                value={money2(k.monto_no_recuperado)}
                explain="Monto de las facturas que fallaron en el rango y a hoy siguen sin pagarse."
              />
              <Kpi
                accent="amber"
                icon="bx-time-five"
                label="Pendiente de cobro hoy"
                value={money2(k.pendiente_total)}
                hint={`${num(k.pendiente_facturas)} facturas abiertas`}
                explain="Todas las facturas abiertas en Stripe hoy (de cualquier fecha). Stripe aún puede reintentar algunas."
              />
            </div>
          </Section>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            <div className="xl:col-span-2 bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              <div className="text-sm font-bold text-slate-800 mb-3">
                Cobrado vs fallido {data.por_dia.length > 45 ? "por semana" : "por día"}
              </div>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={serie}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                    <XAxis dataKey="eje" tick={{ fontSize: 11, fill: "#64748B" }} />
                    <YAxis
                      tick={{ fontSize: 11, fill: "#64748B" }}
                      tickFormatter={(v) => money0(v)}
                      width={60}
                    />
                    <Tooltip content={<ChartTooltip />} cursor={{ fill: "#F1F5F9" }} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="cobrado" name="Cobrado" fill="#10B981" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="fallido" name="Intentos fallidos" fill="#F43F5E" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              <div className="text-sm font-bold text-slate-800 mb-3">Motivos de rechazo</div>
              {data.motivos.length === 0 ? (
                <p className="text-sm text-slate-500">Sin fallos en el rango.</p>
              ) : (
                <ul className="space-y-2">
                  {data.motivos.map((m) => {
                    const max = data.motivos[0].cantidad || 1;
                    return (
                      <li key={m.motivo}>
                        <div className="flex justify-between text-xs mb-0.5">
                          <span className="text-slate-700 font-semibold">{m.motivo}</span>
                          <span className="text-slate-500">
                            {num(m.cantidad)} · {money0(m.monto)}
                          </span>
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded">
                          <div
                            className="h-1.5 bg-rose-400 rounded"
                            style={{ width: `${(m.cantidad / max) * 100}%` }}
                          />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>

          <Section
            icon="bx-list-ul"
            title="Detalle de cobros"
            subtitle="Cada intento de cobro en Stripe. Clic en la empresa para abrir su ficha."
          >
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-2 flex-wrap p-3 border-b border-slate-100">
                {FILTROS.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setFiltro(f.id)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold ring-1 ${
                      filtro === f.id
                        ? "bg-cyan-600 text-white ring-cyan-600"
                        : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
                <input
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar empresa, email o factura"
                  className="ml-auto px-3 py-1.5 border border-slate-300 rounded-lg text-sm w-64 outline-none focus:ring-2 focus:ring-cyan-500"
                />
                <button
                  onClick={descargarCsv}
                  disabled={!filas.length}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg ring-1 ring-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-100 disabled:opacity-50"
                >
                  <i className="bx bx-download" /> CSV
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="text-left px-3 py-2">Fecha</th>
                      <th className="text-left px-3 py-2">Cliente</th>
                      <th className="text-left px-3 py-2">Estado</th>
                      <th className="text-right px-3 py-2">Monto</th>
                      <th className="text-right px-3 py-2">Neto</th>
                      <th className="text-left px-3 py-2">Detalle</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {visibles.map((c) => {
                      const est = ESTADOS[c.estado] || ESTADOS.pending;
                      return (
                        <tr key={c.id} className="hover:bg-slate-50">
                          <td className="px-3 py-2 whitespace-nowrap text-slate-600">
                            <div>{fmtFechaHora(c.fecha)}</div>
                            <div className="flex gap-2">
                              <StripeLink modo={data.modo} tipo="payments" id={c.id}>Cobro</StripeLink>
                              {c.invoice_id && (
                                <StripeLink modo={data.modo} tipo="invoices" id={c.invoice_id}>Factura</StripeLink>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-2">
                            {c.id_usuario ? (
                              <button
                                onClick={() => abrirDetalle(c.id_usuario)}
                                className="font-semibold text-slate-900 hover:text-cyan-700 text-left"
                              >
                                {c.empresa || c.cliente_nombre || `Usuario ${c.id_usuario}`}
                              </button>
                            ) : (
                              <span className="font-semibold text-slate-700">
                                {c.cliente_nombre || "Sin usuario vinculado"}
                              </span>
                            )}
                            <div className="text-xs text-slate-500">{c.cliente_email || "—"}</div>
                          </td>
                          <td className="px-3 py-2">
                            <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ring-1 ${est.cls}`}>
                              {est.label}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-right font-semibold text-slate-900 whitespace-nowrap">
                            {money2(c.monto)}
                            {c.reembolsado > 0 && (
                              <div className="text-[11px] text-slate-500">
                                -{money2(c.reembolsado)} reemb.
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-2 text-right text-slate-600 whitespace-nowrap">
                            {c.estado === "failed" ? "—" : money2(c.neto)}
                          </td>
                          <td className="px-3 py-2 text-xs text-slate-600">
                            {c.estado === "failed" ? (
                              <>
                                <div className="font-semibold text-rose-700">{c.motivo}</div>
                                <div>
                                  {c.tarjeta}
                                  {c.estado_factura && ` · Factura: ${FACTURA[c.estado_factura] || c.estado_factura}`}
                                </div>
                              </>
                            ) : (
                              <>
                                <div>{c.descripcion || "—"}</div>
                                <div className="text-slate-400">
                                  {c.tarjeta}
                                  {c.comision > 0 && ` · comisión ${money2(c.comision)}`}
                                </div>
                              </>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {!visibles.length && (
                      <tr>
                        <td colSpan={6} className="px-3 py-8 text-center text-slate-500">
                          Sin cobros para este filtro.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              {filas.length > 0 && (
                <div className="px-3 py-2 border-t border-slate-100 bg-slate-50 text-xs text-slate-600 flex flex-wrap gap-x-4 gap-y-1">
                  <span>
                    <b className="text-slate-900">{num(filas.length)}</b> movimientos en el filtro
                  </span>
                  <span>
                    Cobrado: <b className="text-emerald-700">{money2(totalesFiltro.cobrado)}</b>
                  </span>
                  <span>
                    Neto: <b className="text-slate-900">{money2(totalesFiltro.neto)}</b>
                  </span>
                  {totalesFiltro.fallido > 0 && (
                    <span>
                      Intentos fallidos: <b className="text-rose-600">{money2(totalesFiltro.fallido)}</b>
                    </span>
                  )}
                </div>
              )}
              {filas.length > 100 && (
                <div className="p-3 text-center border-t border-slate-100">
                  <button
                    onClick={() => setVerTodos(!verTodos)}
                    className="text-xs font-semibold text-cyan-700 hover:underline"
                  >
                    {verTodos ? "Ver menos" : `Ver los ${num(filas.length)} cobros`}
                  </button>
                </div>
              )}
            </div>
          </Section>

          <Section
            icon="bx-time-five"
            title="Facturas abiertas (por cobrar)"
            subtitle="Deuda viva en Stripe hoy, sin importar el rango elegido. Ordenadas por monto."
          >
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="text-left px-3 py-2">Cliente</th>
                    <th className="text-left px-3 py-2">Suscripción</th>
                    <th className="text-right px-3 py-2">Monto</th>
                    <th className="text-left px-3 py-2">Creada</th>
                    <th className="text-center px-3 py-2">Intentos</th>
                    <th className="text-left px-3 py-2">Próximo reintento</th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.pendientes.map((p) => {
                    const st = SUB_STATUS[p.sub_status] || null;
                    return (
                    <tr
                      key={p.invoice_id}
                      className={p.sub_muerta ? "bg-rose-50/40 hover:bg-rose-50" : "hover:bg-slate-50"}
                    >
                      <td className="px-3 py-2">
                        {p.id_usuario ? (
                          <button
                            onClick={() => abrirDetalle(p.id_usuario)}
                            className="font-semibold text-slate-900 hover:text-cyan-700 text-left"
                          >
                            {p.empresa || p.cliente_nombre || `Usuario ${p.id_usuario}`}
                          </button>
                        ) : (
                          <span className="font-semibold text-slate-700">
                            {p.cliente_nombre || "Sin usuario vinculado"}
                          </span>
                        )}
                        <div className="text-xs text-slate-500">{p.cliente_email || "—"}</div>
                      </td>
                      <td className="px-3 py-2 text-xs">
                        {p.sub_id ? (
                          <>
                            <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ring-1 ${st ? st.cls : "bg-slate-100 text-slate-700 ring-slate-200"}`}>
                              {st ? st.label : p.sub_status}
                            </span>
                            {p.sub_muerta && (
                              <div className="text-rose-600 font-semibold mt-0.5">Deuda muerta: anular</div>
                            )}
                            {p.estado_usuario && !p.sub_muerta && (
                              <div className="text-slate-500 mt-0.5">Cuenta {p.estado_usuario}</div>
                            )}
                          </>
                        ) : (
                          <span className="text-slate-500">Factura manual</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right font-semibold text-slate-900">
                        {money2(p.monto)}
                      </td>
                      <td className="px-3 py-2 text-slate-600 whitespace-nowrap">
                        {new Date(p.creada).toLocaleDateString("es-EC", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="px-3 py-2 text-center text-slate-600">{num(p.intentos)}</td>
                      <td className="px-3 py-2 text-slate-600 whitespace-nowrap">
                        {p.proximo_intento ? (
                          fmtFechaHora(p.proximo_intento)
                        ) : (
                          <span className="text-rose-600 font-semibold">Stripe ya no reintenta</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <div className="flex flex-col items-end gap-0.5">
                          {p.url_pago && !p.sub_muerta && (
                            <a
                              href={p.url_pago}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs font-semibold text-cyan-700 hover:underline whitespace-nowrap"
                            >
                              Enlace de pago <i className="bx bx-link-external" />
                            </a>
                          )}
                          <StripeLink modo={data.modo} tipo="invoices" id={p.invoice_id}>
                            Ver en Stripe
                          </StripeLink>
                        </div>
                      </td>
                    </tr>
                    );
                  })}
                  {!data.pendientes.length && (
                    <tr>
                      <td colSpan={7} className="px-3 py-8 text-center text-slate-500">
                        No hay facturas abiertas.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Section>

          <p className="text-center text-xs text-slate-400">
            Datos leídos de Stripe en vivo · {new Date(data.generado).toLocaleString("es-EC")} · caché de 5 min
          </p>
        </div>
      )}

      {detalle.open && (
        <DrawerDetalle
          loading={detalle.loading}
          data={detalle.data}
          onClose={() => setDetalle({ open: false, loading: false, data: null })}
        />
      )}
    </div>
  );
}
