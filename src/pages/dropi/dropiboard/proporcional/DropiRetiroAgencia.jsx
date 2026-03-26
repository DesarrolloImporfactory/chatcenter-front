import React from "react";

export default function DropiRetiroAgencia({ orders }) {
  if (!orders || orders.length === 0) return null;

  const urgentCount = orders.filter((o) => o.days >= 5).length;

  return (
    <div className="mb-6 rounded-2xl border-2 border-orange-200 bg-gradient-to-r from-orange-50/80 to-white p-5 shadow-sm">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 rounded-xl bg-orange-100 flex items-center justify-center text-lg">
          📦
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-bold text-orange-700">
            Retiro en Agencia
          </h3>
          <p className="text-[10px] text-orange-500">
            Órdenes esperando retiro del cliente en agencia courier
          </p>
        </div>
        <div className="flex items-center gap-2">
          {urgentCount > 0 && (
            <span className="inline-flex items-center gap-1 bg-red-500 text-white text-[10px] font-extrabold px-2.5 py-1 rounded-full animate-pulse">
              ⚠ {urgentCount} urgente{urgentCount > 1 ? "s" : ""}
            </span>
          )}
          <span className="bg-orange-500 text-white text-xs font-extrabold px-3 py-1 rounded-full">
            {orders.length}
          </span>
        </div>
      </div>

      <div className="overflow-auto rounded-xl max-h-[300px]">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-orange-50/90 backdrop-blur-sm">
            <tr className="text-[10px] uppercase text-orange-600 tracking-wider">
              <th className="text-left px-3 py-2 font-semibold"># Orden</th>
              <th className="text-left px-3 py-2 font-semibold">Cliente</th>
              <th className="text-left px-3 py-2 font-semibold">Ciudad</th>
              <th className="text-left px-3 py-2 font-semibold">Courier</th>
              <th className="text-left px-3 py-2 font-semibold">Guía</th>
              <th className="text-right px-3 py-2 font-semibold">Valor</th>
              <th className="text-center px-3 py-2 font-semibold">Días</th>
            </tr>
          </thead>
          <tbody>
            {orders.slice(0, 15).map((o) => {
              const isUrgent = o.days >= 5;
              const isWarning = o.days >= 3 && o.days < 5;
              return (
                <tr
                  key={o.id}
                  className={`border-t border-orange-100/60 transition ${
                    isUrgent ? "bg-red-50/40" : ""
                  }`}
                >
                  <td className="px-3 py-2 font-bold text-slate-900 text-xs">
                    #{o.id}
                  </td>
                  <td className="px-3 py-2 text-slate-700 text-xs">
                    {`${o.name || ""} ${o.surname || ""}`.trim() || "—"}
                  </td>
                  <td className="px-3 py-2 text-slate-500 text-xs">
                    {o.city || "—"}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-medium text-[10px]">
                      {o.shipping_company || "—"}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-slate-500 font-mono text-[11px]">
                    {o.shipping_guide || "—"}
                  </td>
                  <td className="px-3 py-2 text-right font-semibold text-slate-800 text-xs">
                    ${Number(o.total_order || 0).toFixed(2)}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                        isUrgent
                          ? "bg-red-100 text-red-700"
                          : isWarning
                            ? "bg-amber-100 text-amber-700"
                            : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {isUrgent && (
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                      )}
                      {o.days}d
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
