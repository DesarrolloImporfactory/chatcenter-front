import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import chatApi from "../../../../api/chatcenter";
import Section from "../shared/Section";
import { Kpi } from "./IngresosKpis";
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
  { id: "30", label: "Últimos 30 días", rango: () => [haceDias(29), new Date()] },
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
];

// Celda "N cuentas · $X/mes" de la tabla.
function Grupo({ g, tono }) {
  if (!g?.cuentas) return <span className="text-slate-300">—</span>;
  return (
    <div className="leading-tight">
      <div className={`font-bold ${tono}`}>{money0(g.mrr)}/mes</div>
      <div className="text-[11px] text-slate-500">
        {num(g.cuentas)} cuenta{g.cuentas === 1 ? "" : "s"}
        {g.unidades !== g.cuentas ? ` · ${num(g.unidades)} unidades` : ""}
      </div>
    </div>
  );
}

export default function AddonsTab() {
  const [preset, setPreset] = useState("30");
  const [desde, setDesde] = useState(ymd(haceDias(29)));
  const [hasta, setHasta] = useState(ymd(new Date()));
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const cargar = useCallback(
    async (fresh = false) => {
      setLoading(true);
      try {
        const { data: r } = await chatApi.get("admin_dashboard/addons", {
          params: { desde, hasta, ...(fresh ? { fresh: 1 } : {}) },
        });
        setData(r.data);
      } catch (e) {
        toast.error(
          e?.response?.data?.message ||
            "No se pudo cargar la facturación por complemento",
        );
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

  const t = data?.totales;
  const addons = data?.addons || [];
  const mayorMrr = Math.max(1, ...addons.map((a) => a.activas.mrr));
  const lider = addons.find((a) => a.cuentas_total > 0) || null;

  return (
    <div className="space-y-6">
      {/* Selector de rango (solo afecta a "Cobrado en el rango") */}
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
          <p className="mt-2 text-sm">
            Consultando Stripe… puede tardar unos segundos
          </p>
        </div>
      )}

      {data && (
        <div
          className={`space-y-6 ${loading ? "opacity-60 pointer-events-none" : ""}`}
        >
          {data.truncado && (
            <div className="text-xs bg-amber-50 text-amber-800 ring-1 ring-amber-200 rounded-lg px-3 py-2">
              El rango tiene demasiadas facturas y lo cobrado puede estar
              incompleto. Usa un rango más corto.
            </div>
          )}

          <Section
            icon="bx-extension"
            title="Complementos"
            subtitle="Lo que factura cada producto adicional, aparte del plan. El recurrente es de hoy; lo cobrado depende del rango elegido."
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              <Kpi
                accent="emerald"
                icon="bx-dollar-circle"
                label="Recurrente por complementos"
                value={`${money0(t.mrr_addons)}/mes`}
                hint={`${pct1(t.pct_addons_mrr)} del recurrente total`}
                explain="Suma mensual de los complementos en suscripciones que se están cobrando hoy. No incluye las que están en prueba gratis."
              />
              <Kpi
                accent="cyan"
                icon="bx-time-five"
                label="En prueba gratis"
                value={`${money0(t.mrr_addons_en_prueba)}/mes`}
                hint="Empieza a cobrarse al terminar la prueba"
                explain="Complementos dentro de suscripciones en prueba gratis (cortesías, combos, alumnos). Todavía no facturan."
              />
              <Kpi
                accent="violet"
                icon="bx-wallet"
                label="Cobrado en el rango"
                value={money2(t.cobrado_addons)}
                hint={`${pct1(t.pct_addons_cobrado)} de lo cobrado (${money0(t.cobrado_total)})`}
                explain="Líneas de complemento en las facturas pagadas del rango. Incluye prorrateos al agregar o quitar unidades a mitad de ciclo."
              />
              <Kpi
                accent="amber"
                icon="bx-trophy"
                label="Con más acogida"
                value={lider ? lider.nombre : "—"}
                hint={
                  lider
                    ? `${num(lider.cuentas_total)} cuentas lo tienen`
                    : "Nadie tiene complementos todavía"
                }
                explain="El complemento que más recurrente genera hoy; si ninguno cobra aún, el que más cuentas tienen."
              />
            </div>
          </Section>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
            <table className="w-full text-sm min-w-[860px]">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-200">
                  <th className="px-4 py-3 font-bold">Complemento</th>
                  <th className="px-4 py-3 font-bold">Cobrando hoy</th>
                  <th className="px-4 py-3 font-bold">En prueba gratis</th>
                  <th className="px-4 py-3 font-bold">En mora</th>
                  <th className="px-4 py-3 font-bold">Otorgado a mano</th>
                  <th className="px-4 py-3 font-bold text-right">
                    Cobrado en el rango
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {addons.map((a) => (
                  <tr key={a.clave} className="align-top">
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-900">
                        {a.nombre}
                        {!a.activo && (
                          <span className="ml-2 text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                            Inactivo
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {money0(a.precio)}/mes por unidad ·{" "}
                        {num(a.cuentas_total)} cuenta
                        {a.cuentas_total === 1 ? "" : "s"} en total
                      </div>
                      <div className="mt-2 h-1.5 w-40 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-emerald-500"
                          style={{
                            width: `${Math.round((a.activas.mrr / mayorMrr) * 100)}%`,
                          }}
                        />
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Grupo g={a.activas} tono="text-emerald-700" />
                    </td>
                    <td className="px-4 py-3">
                      <Grupo g={a.prueba} tono="text-cyan-700" />
                    </td>
                    <td className="px-4 py-3">
                      <Grupo g={a.mora} tono="text-amber-700" />
                    </td>
                    <td className="px-4 py-3">
                      {a.a_mano.cuentas ? (
                        <div className="leading-tight">
                          <div className="font-bold text-slate-700">
                            {num(a.a_mano.cuentas)} cuenta
                            {a.a_mano.cuentas === 1 ? "" : "s"}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {a.a_mano.unidades !== a.a_mano.cuentas
                              ? `${num(a.a_mano.unidades)} unidades · `
                              : ""}
                            sin cobro
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="font-bold text-slate-900">
                        {money2(a.cobrado.monto)}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {num(a.cobrado.facturas)} factura
                        {a.cobrado.facturas === 1 ? "" : "s"}
                      </div>
                    </td>
                  </tr>
                ))}
                {addons.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-10 text-center text-slate-500"
                    >
                      No hay complementos creados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-slate-500">
            «Otorgado a mano» son cuentas con el complemento encendido desde el
            Panel de usuarios, sin item en Stripe: lo usan pero no se les cobra.
            «En mora» son suscripciones con la renovación rebotada. Los planes
            suman {money0(t.mrr_planes)}/mes de recurrente en{" "}
            {num(t.suscripciones_pagando)} suscripciones que están pagando.
          </p>
        </div>
      )}
    </div>
  );
}
