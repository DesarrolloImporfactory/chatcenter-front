import Section from "../shared/Section";
import {
  money0,
  planDurationLabel,
  PRODUCTO_LABEL,
  PRODUCTO_BADGE,
} from "../utils";

export default function PlanesTable({ planes, mrrStripe }) {
  return (
    <Section
      icon="bx-package"
      title="Desglose por plan"
      subtitle="Distribución entre los planes · Planes TEST excluidos automáticamente"
    >
      {planes.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400">
          Sin planes con clientes activos.
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3 text-left">Plan</th>
                <th className="px-4 py-3 text-left">Producto</th>
                <th className="px-4 py-3 text-right">Pagando</th>
                <th className="px-4 py-3 text-right">Trial Stripe</th>
                <th className="px-4 py-3 text-right">Acceso manual</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3 text-right">MRR aporta</th>
                <th className="px-4 py-3 text-left w-32">% del MRR</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {planes.map((p) => {
                const mrrP = Number(p.mrr_stripe_plan || 0);
                const pctTotal = mrrStripe > 0 ? (mrrP / mrrStripe) * 100 : 0;
                return (
                  <tr key={p.id_plan} className="hover:bg-slate-50 transition">
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-900">
                        {p.nombre_plan}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {planDurationLabel(p)}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] font-semibold ring-1 ${PRODUCTO_BADGE[p.tools_access] || PRODUCTO_BADGE.both}`}
                      >
                        {PRODUCTO_LABEL[p.tools_access] || p.tools_access}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-mono font-bold text-emerald-700 text-base">
                        {p.pagando_stripe || 0}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-mono font-bold text-cyan-700 text-base">
                        {p.trial_stripe || 0}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-mono font-bold text-amber-700 text-base">
                        {p.acceso_manual || 0}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-mono font-bold text-slate-700 text-base">
                        {p.activos_total}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-bold text-slate-900">
                        {money0(mrrP)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-cyan-500 to-emerald-500"
                            style={{ width: `${Math.min(100, pctTotal)}%` }}
                          />
                        </div>
                        <span className="text-xs font-bold text-slate-600 w-10 text-right">
                          {pctTotal.toFixed(0)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Section>
  );
}
