import React, { useMemo } from "react";

const fmt = (n) =>
  `$${Number(n || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const DropiProfitBar = ({ profitData }) => {
  if (!profitData || profitData.totalOrders === 0) return null;

  // Si es cuenta proveedor (todos profit = 0 y ya completo), no mostrar
  if (profitData.isComplete && profitData.profitPotencialTotal === 0)
    return null;

  const {
    profitEntregadas,
    profitPotencialTotal,
    profitCalculated,
    profitPending,
    totalOrders,
    entregadas,
    entregables,
    avgProfitPerOrder,
    isComplete,
    pctCalculated,
  } = profitData;

  const profitSiEntreganTodas = useMemo(() => {
    if (entregables <= 0 || avgProfitPerOrder <= 0) return 0;
    return Math.round(entregables * avgProfitPerOrder * 100) / 100;
  }, [entregables, avgProfitPerOrder]);

  const pctBarra = useMemo(() => {
    if (profitSiEntreganTodas <= 0) return 0;
    return Math.min(100, (profitEntregadas / profitSiEntreganTodas) * 100);
  }, [profitEntregadas, profitSiEntreganTodas]);

  const ticketProfit = entregadas > 0 ? profitEntregadas / entregadas : 0;

  return (
    <div className="mb-4 rounded-2xl border border-slate-200 bg-white overflow-hidden">
      {/* Header */}
      <div className="relative bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 px-5 py-3.5">
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
            <div className="w-8 h-8 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <svg
                className="w-4 h-4 text-white"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="12" y1="1" x2="12" y2="23" />
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-bold text-white leading-tight">
                Utilidad Real
              </h3>
              <p className="text-[10px] text-emerald-100 mt-0.5">
                Información real extraída orden por orden desde Dropi
              </p>
            </div>
          </div>

          {!isComplete && (
            <div className="flex items-center gap-1.5 bg-white/15 backdrop-blur-sm border border-white/20 rounded-lg px-2.5 py-1">
              <svg
                className="w-3 h-3 text-white animate-spin"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  cx="12"
                  cy="12"
                  r="9"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  opacity="0.25"
                />
                <path
                  d="M21 12a9 9 0 0 0-9-9"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              </svg>
              <span className="text-[10px] text-white font-medium">
                {profitCalculated}/{totalOrders} órdenes
              </span>
            </div>
          )}
          {isComplete && (
            <div className="flex items-center gap-1.5 bg-white/15 backdrop-blur-sm border border-white/20 rounded-lg px-2.5 py-1">
              <svg
                className="w-3 h-3 text-white"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
              >
                <path d="M20 6L9 17l-5-5" />
              </svg>
              <span className="text-[10px] text-white font-medium">
                100% calculado
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="px-5 py-5">
        {/* Métricas */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-5">
          {/* Ya cobrado */}
          <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3">
            <div className="flex items-center gap-1.5 mb-1">
              <svg
                className="w-3.5 h-3.5 text-emerald-500"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <path d="M20 6L9 17l-5-5" />
              </svg>
              <span className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wide">
                Ya cobrado
              </span>
            </div>
            <span className="text-xl font-extrabold text-emerald-700">
              {fmt(profitEntregadas)}
            </span>
            <p className="text-[10px] text-emerald-500 mt-0.5">
              de {entregadas} entregada{entregadas !== 1 ? "s" : ""}
            </p>
          </div>

          {/* Potencial */}
          <div className="bg-sky-50 border border-sky-100 rounded-xl px-4 py-3">
            <div className="flex items-center gap-1.5 mb-1">
              <svg
                className="w-3.5 h-3.5 text-sky-500"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
              </svg>
              <span className="text-[10px] font-semibold text-sky-600 uppercase tracking-wide">
                Si se entregan todas
              </span>
            </div>
            <span className="text-xl font-extrabold text-sky-700">
              {fmt(profitSiEntreganTodas)}
            </span>
            <p className="text-[10px] text-sky-500 mt-0.5">
              de {entregables} orden{entregables !== 1 ? "es" : ""} entregable
              {entregables !== 1 ? "s" : ""}
            </p>
          </div>

          {/* Promedio */}
          <div className="bg-violet-50 border border-violet-100 rounded-xl px-4 py-3 col-span-2 sm:col-span-1">
            <div className="flex items-center gap-1.5 mb-1">
              <svg
                className="w-3.5 h-3.5 text-violet-500"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <rect x="2" y="7" width="20" height="14" rx="2" />
                <path d="M16 7V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v3" />
              </svg>
              <span className="text-[10px] font-semibold text-violet-600 uppercase tracking-wide">
                Utilidad promedio
              </span>
            </div>
            <span className="text-xl font-extrabold text-violet-700">
              {fmt(ticketProfit)}
            </span>
            <p className="text-[10px] text-violet-500 mt-0.5">
              por cada entrega exitosa
            </p>
          </div>
        </div>

        {/* Barra de progreso */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-600">
              Progreso de tu utilidad
            </span>
            <span className="text-xs font-bold text-emerald-600">
              {pctBarra > 0 ? `${pctBarra.toFixed(1)}%` : "0%"} cobrado
            </span>
          </div>

          <div className="relative h-8 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
            <div
              className="absolute inset-0 rounded-full"
              style={{
                background:
                  "repeating-linear-gradient(45deg, transparent, transparent 6px, rgba(56,189,248,0.08) 6px, rgba(56,189,248,0.08) 12px)",
              }}
            />
            <div
              className="absolute left-0 top-0 h-full rounded-full transition-all duration-1000 ease-out"
              style={{
                width: `${Math.max(pctBarra, pctBarra > 0 ? 3 : 0)}%`,
                background: "linear-gradient(90deg, #059669, #10B981, #34D399)",
                boxShadow:
                  pctBarra > 0 ? "2px 0 8px rgba(16,185,129,0.4)" : "none",
              }}
            />
            <div className="absolute inset-0 flex items-center justify-between px-3">
              <span
                className={`text-[10px] font-bold ${pctBarra > 15 ? "text-white" : "text-emerald-700"}`}
              >
                {fmt(profitEntregadas)}
              </span>
              <span className="text-[10px] font-bold text-sky-600">
                {fmt(profitSiEntreganTodas)}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between mt-1.5">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span className="text-[10px] text-slate-500">
                Cobrado ({entregadas} entregada
                {entregadas !== 1 ? "s" : ""})
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-sky-300 border border-sky-400" />
              <span className="text-[10px] text-slate-500">
                Potencial ({entregables - entregadas} pendiente
                {entregables - entregadas !== 1 ? "s" : ""})
              </span>
            </div>
          </div>
        </div>

        {/* Motivacional */}
        {profitSiEntreganTodas > 0 &&
          profitEntregadas < profitSiEntreganTodas && (
            <div className="mt-3 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl px-4 py-2.5 flex items-center gap-2.5">
              <span className="text-lg">💰</span>
              <p className="text-[11px] text-amber-800 leading-snug">
                <strong>
                  ¡Tienes {fmt(profitSiEntreganTodas - profitEntregadas)} de
                  utilidad por cobrar!
                </strong>{" "}
                Cada orden entregada suma en promedio {fmt(avgProfitPerOrder)} a
                tu bolsillo. Haz seguimiento a tus novedades y retiros para
                maximizar entregas.
              </p>
            </div>
          )}

        {/* Sincronizando */}
        {!isComplete && (
          <div className="mt-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
            <div className="flex items-center gap-2 mb-1.5">
              <svg
                className="w-3.5 h-3.5 animate-spin text-blue-500"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  cx="12"
                  cy="12"
                  r="9"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  opacity="0.25"
                />
                <path
                  d="M21 12a9 9 0 0 0-9-9"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              </svg>
              <span className="text-[11px] font-semibold text-blue-700">
                Sincronizando utilidad — {profitCalculated} de {totalOrders}{" "}
                órdenes ({pctCalculated}%)
              </span>
            </div>
            {/* Mini barra de progreso de cálculo */}
            <div className="w-full h-1.5 bg-blue-100 rounded-full overflow-hidden mb-2">
              <div
                className="h-full bg-blue-500 rounded-full transition-all duration-500"
                style={{ width: `${pctCalculated}%` }}
              />
            </div>
            <p className="text-[10px] text-blue-600 leading-snug">
              Estamos consultando cada orden en Dropi para obtener tu utilidad
              real. Este proceso se ejecuta automáticamente mientras estés en
              esta pantalla.{" "}
              <strong>
                La próxima vez que consultes este mismo rango, los datos estarán
                listos al instante.
              </strong>
            </p>
          </div>
        )}

        {/* Completo */}
        {isComplete && profitPotencialTotal > 0 && (
          <div className="mt-3 flex items-center gap-2 text-[10px] text-emerald-500">
            <svg
              className="w-3 h-3"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            >
              <path d="M20 6L9 17l-5-5" />
            </svg>
            <span>
              Utilidad calculada al 100% · Información real de las {totalOrders}{" "}
              órdenes en Dropi
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default DropiProfitBar;
