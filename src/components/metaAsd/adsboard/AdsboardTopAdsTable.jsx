import React from "react";

/**
 * AdsboardTopAdsTable
 *
 * Tabla de los anuncios con mejor rendimiento ordenados por gasto.
 *
 * Columnas:
 * - Ad: nombre del anuncio + thumbnail si disponible
 * - Campaña: a qué campaña pertenece este anuncio
 * - Gasto: cuánto se ha invertido en este anuncio específico
 * - Revenue: ventas atribuidas a este anuncio
 * - ROAS: retorno por dólar para este anuncio
 * - Compras: ventas generadas por este anuncio
 * - CPA: costo por venta de este anuncio
 * - CTR: tasa de clics de este anuncio
 * - Clicks: total de clics recibidos
 * - Post ID: identificador de la publicación en Facebook (link directo)
 */

const fmt = (n, decimals = 0) => {
  if (n == null || isNaN(n)) return "—";
  return Number(n).toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};

const fmtCurrency = (n, currency = "USD") => {
  if (n == null || isNaN(n)) return "—";
  return Number(n).toLocaleString("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  });
};

export default function AdsboardTopAdsTable({ topAds, currency = "USD" }) {
  if (!topAds.length) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white px-8 py-12 text-center">
        <i className="bx bx-trophy text-3xl text-slate-300 mb-2" />
        <p className="text-sm text-slate-500">
          No hay datos de anuncios para este período.
        </p>
        <p className="text-xs text-slate-400 mt-1">
          Prueba con un rango de fechas diferente.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
      {/* Header explicativo */}
      <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50">
        <div className="flex items-center gap-2">
          <i className="bx bx-trophy text-indigo-600" />
          <span className="text-xs font-semibold text-slate-700">
            Top Ads por rendimiento ({topAds.length})
          </span>
          <span className="text-[10px] text-slate-400 ml-auto">
            Ordenados por mayor gasto · Click en Post ID para ver en Facebook
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-100">
              <th className="px-4 pb-3 pt-4">Ad</th>
              <th className="pb-3 pt-4">Campaña</th>
              <th className="pb-3 pt-4 text-right">Gasto</th>
              <th className="pb-3 pt-4 text-right">Revenue</th>
              <th className="pb-3 pt-4 text-right">ROAS</th>
              <th className="pb-3 pt-4 text-right">Compras</th>
              <th className="pb-3 pt-4 text-right">CPA</th>
              <th className="pb-3 pt-4 text-right">CTR</th>
              <th className="pb-3 pt-4 text-right">Clicks</th>
              <th className="pb-3 pt-4 pr-4">Post ID</th>
            </tr>
          </thead>
          <tbody>
            {topAds.map((ad, i) => (
              <tr
                key={ad.ad_id || i}
                className="border-b border-slate-50 hover:bg-slate-50/50"
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {ad.thumbnail_url ? (
                      <img
                        src={ad.thumbnail_url}
                        alt=""
                        className="w-8 h-8 rounded-lg object-cover ring-1 ring-slate-200 shrink-0"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-slate-100 grid place-items-center shrink-0">
                        <i className="bx bx-image text-slate-400" />
                      </div>
                    )}
                    <span className="font-medium text-slate-800 max-w-[150px] truncate">
                      {ad.ad_name}
                    </span>
                  </div>
                </td>
                <td className="py-3 text-slate-500 max-w-[130px] truncate">
                  {ad.campaign_name}
                </td>
                <td className="py-3 text-right tabular-nums">
                  {fmtCurrency(ad.spend, currency)}
                </td>
                <td className="py-3 text-right tabular-nums text-emerald-700 font-medium">
                  {fmtCurrency(ad.purchase_value, currency)}
                </td>
                <td className="py-3 text-right tabular-nums font-medium">
                  <span
                    className={
                      ad.roas >= 2
                        ? "text-emerald-700"
                        : ad.roas > 0
                          ? "text-amber-700"
                          : "text-slate-400"
                    }
                  >
                    {fmt(ad.roas, 2)}x
                  </span>
                </td>
                <td className="py-3 text-right tabular-nums">
                  {fmt(ad.purchases)}
                </td>
                <td className="py-3 text-right tabular-nums">
                  {fmtCurrency(ad.cpa_purchase, currency)}
                </td>
                <td className="py-3 text-right tabular-nums">
                  {fmt(ad.ctr, 2)}%
                </td>
                <td className="py-3 text-right tabular-nums">
                  {fmt(ad.clicks)}
                </td>
                <td className="py-3 pr-4 text-[10px] text-slate-400 font-mono max-w-[120px] truncate">
                  {ad.post_id ? (
                    <a
                      href={`https://www.facebook.com/${ad.post_id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="underline hover:text-blue-600"
                      title={ad.post_id}
                    >
                      {ad.post_id}
                    </a>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
