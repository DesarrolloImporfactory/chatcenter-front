import { fmtNumber } from "./helpers";

export default function KpisRow({ kpis, onKpiClick, activeKpi }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
      <KpiCard
        kpiKey="total"
        color="#0B1426"
        label="Total"
        value={kpis.total_usuarios}
        icon="bx-group"
        onClick={onKpiClick}
        active={activeKpi === "total"}
      />
      <KpiCard
        kpiKey="activos"
        color="#10B981"
        label="Activos"
        value={kpis.total_activos}
        icon="bx-check-circle"
        onClick={onKpiClick}
        active={activeKpi === "activos"}
      />
      <KpiCard
        kpiKey="por_vencer_7d"
        color="#F59E0B"
        label="Por vencer 7d"
        value={kpis.por_vencer_7d}
        icon="bx-time-five"
        onClick={onKpiClick}
        active={activeKpi === "por_vencer_7d"}
        highlight={kpis.por_vencer_7d > 0 && activeKpi !== "por_vencer_7d"}
      />
      <KpiCard
        kpiKey="vencidos"
        color="#EF4444"
        label="Vencidos"
        value={kpis.total_vencidos}
        icon="bx-x-circle"
        onClick={onKpiClick}
        active={activeKpi === "vencidos"}
      />
      <KpiCard
        kpiKey="suspendidos"
        color="#F97316"
        label="Suspendidos"
        value={kpis.total_suspendidos}
        icon="bx-pause-circle"
        onClick={onKpiClick}
        active={activeKpi === "suspendidos"}
      />
      <KpiCard
        kpiKey="trial_promo"
        color="#06B6D4"
        label="Trial + Promo"
        value={Number(kpis.total_trial || 0) + Number(kpis.total_promo || 0)}
        icon="bx-gift"
        onClick={onKpiClick}
        active={activeKpi === "trial_promo"}
      />
      <KpiCard
        kpiKey="nuevos_30d"
        color="#8B5CF6"
        label="Nuevos 30d"
        value={kpis.nuevos_ultimos_30d}
        icon="bx-user-plus"
        onClick={onKpiClick}
        active={activeKpi === "nuevos_30d"}
      />
    </div>
  );
}

function KpiCard({
  kpiKey,
  label,
  value,
  color,
  icon,
  highlight,
  onClick,
  active,
}) {
  const clickable = typeof onClick === "function";
  const Tag = clickable ? "button" : "div";
  return (
    <Tag
      type={clickable ? "button" : undefined}
      onClick={clickable ? () => onClick(kpiKey) : undefined}
      className={`bg-white rounded-xl border p-3 shadow-sm transition text-left w-full ${
        active
          ? "border-transparent ring-2 shadow-md"
          : highlight
            ? "border-amber-200 ring-2 ring-amber-100"
            : "border-slate-200"
      } ${clickable ? "hover:shadow-md hover:-translate-y-0.5 cursor-pointer" : ""}`}
      style={
        active
          ? { boxShadow: `0 0 0 2px ${color}, 0 6px 16px ${color}30` }
          : undefined
      }
    >
      <div className="flex items-center gap-2.5">
        <div
          className="h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors"
          style={{
            backgroundColor: active ? color : `${color}15`,
            color: active ? "#fff" : color,
          }}
        >
          <i className={`bx ${icon} text-xl`} />
        </div>
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold truncate">
            {label}
          </div>
          <div
            className="text-xl font-extrabold leading-none mt-0.5"
            style={{ color: active ? color : "#0B1426" }}
          >
            {fmtNumber(value)}
          </div>
        </div>
      </div>
    </Tag>
  );
}
