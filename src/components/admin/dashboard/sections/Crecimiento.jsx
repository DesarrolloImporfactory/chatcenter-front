import Section from "../shared/Section";
import { Kpi } from "./IngresosKpis";
import { num, pct1 } from "../utils";

export default function Crecimiento({ resumen, onOpenDrawer }) {
  return (
    <Section
      icon="bx-trending-up"
      title="Crecimiento del mes"
      subtitle="Movimiento del mes en curso · Captación, pérdida y oportunidad inmediata"
    >
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi
          accent="emerald"
          icon="bx-user-plus"
          label="Nuevos registros"
          value={num(resumen.nuevos_mes)}
          delta={resumen.deltas?.nuevos_mes}
          explain="Cuentas creadas este mes."
        />
        <Kpi
          accent="rose"
          icon="bx-user-x"
          label="Cancelados"
          value={num(resumen.cancelados_mes)}
          explain="Suscripciones con canceled_at este mes."
        />
        <Kpi
          accent={resumen.churn_pct > 5 ? "rose" : "emerald"}
          icon="bx-trending-down"
          label="Churn mensual"
          value={pct1(resumen.churn_pct)}
          explain="Cancelados ÷ pagando al inicio del mes × 100. SaaS sano: menor a 5%."
          hint={resumen.churn_pct > 5 ? "Alto — vigilar" : "Saludable"}
        />
        <Kpi
          accent="cyan"
          icon="bx-gift"
          label="Trial → Paid"
          value={pct1(resumen.tasa_conversion_pct)}
          explain="De clientes que terminaron periodo gratis en últimos 90 días, % que paga ahora."
          hint={`Muestra: ${resumen.conversion_muestra?.convertidos || 0}/${resumen.conversion_muestra?.total || 0}`}
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
        <div
          onClick={() =>
            onOpenDrawer(
              "por_convertir_30d",
              "Terminan periodo en 30 días",
              "amber",
            )
          }
          className="bg-white rounded-xl border-2 border-amber-200 p-4 shadow-sm cursor-pointer hover:border-amber-400 hover:shadow-md transition"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="h-10 w-10 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                <i className="bx bx-time-five text-2xl" />
              </div>
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-amber-700">
                  🎯 Acción inmediata · 30 días
                </div>
                <div className="text-sm font-bold text-slate-900">
                  Terminan su periodo gratis
                </div>
              </div>
            </div>
            <div className="text-3xl font-extrabold text-amber-700">
              {num(resumen.por_convertir_30d)}
            </div>
          </div>
          <div className="text-xs text-slate-600 mt-2 pt-2 border-t border-amber-100">
            Acceso manual cuyo periodo vence en 30 días. Si no capturan tarjeta,
            los pierdes. <b className="text-amber-700">Click para ver lista.</b>
          </div>
        </div>
        <div
          onClick={() =>
            onOpenDrawer("por_convertir_30d", "Pipeline 60 días", "cyan")
          }
          className="bg-white rounded-xl border border-cyan-200 p-4 shadow-sm cursor-pointer hover:border-cyan-400 hover:shadow-md transition"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="h-10 w-10 rounded-lg bg-cyan-50 text-cyan-700 flex items-center justify-center">
                <i className="bx bx-time text-2xl" />
              </div>
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-cyan-700">
                  Pipeline · 60 días
                </div>
                <div className="text-sm font-bold text-slate-900">
                  Terminan en 60 días
                </div>
              </div>
            </div>
            <div className="text-3xl font-extrabold text-cyan-700">
              {num(resumen.por_convertir_60d)}
            </div>
          </div>
          <div className="text-xs text-slate-600 mt-2 pt-2 border-t border-cyan-100">
            Pipeline a 2 meses. Tiempo para diseñar campaña de captura de
            tarjeta.
          </div>
        </div>
      </div>
    </Section>
  );
}
