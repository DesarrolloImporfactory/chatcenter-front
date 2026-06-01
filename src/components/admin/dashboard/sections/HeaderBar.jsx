import { useNavigate } from "react-router-dom";
import { num } from "../utils";

export default function HeaderBar({
  resumen,
  refreshing,
  onRecalcular,
  diasComp,
  setDiasComp,
  fechaHoy,
  fechaRef,
}) {
  const navigate = useNavigate();
  return (
    <>
      <header className="flex items-start justify-between flex-wrap gap-3 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-cyan-700">
            <i className="bx bxs-dashboard" /> Dashboard ImporChat
          </div>
          <h1 className="mt-1 text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
            Salud del negocio
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Métricas en vivo · {num(resumen.total_registros_bd)} registros en la
            base de datos
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate("/admin/usuarios")}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white text-slate-700 ring-1 ring-slate-200 font-semibold text-sm hover:bg-slate-100 transition"
          >
            <i className="bx bx-list-ul" /> Panel de usuarios
          </button>
          <button
            onClick={onRecalcular}
            disabled={refreshing}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 text-white font-semibold text-sm hover:bg-slate-800 disabled:opacity-50 transition"
          >
            <i
              className={`bx ${refreshing ? "bx-loader-alt bx-spin" : "bx-refresh"}`}
            />
            {refreshing ? "Recalculando…" : "Recalcular ahora"}
          </button>
        </div>
      </header>

      <div className="bg-gradient-to-r from-cyan-50 to-blue-50 rounded-xl border border-cyan-200 px-4 py-3 flex items-center gap-3 flex-wrap">
        <i className="bx bx-calendar text-cyan-700 text-xl" />
        <div className="flex items-center gap-2 text-sm flex-wrap flex-1">
          <span className="text-slate-700">
            <b>Comparando:</b> hoy
          </span>
          <span className="font-mono text-cyan-800 bg-white px-2 py-0.5 rounded ring-1 ring-cyan-200">
            {fechaHoy.toLocaleDateString("es-EC", {
              day: "2-digit",
              month: "long",
              year: "numeric",
            })}
          </span>
          <span className="text-slate-400">vs</span>
          <span className="font-mono text-slate-700 bg-white px-2 py-0.5 rounded ring-1 ring-slate-200">
            {fechaRef
              ? fechaRef.toLocaleDateString("es-EC", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })
              : "sin referencia"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-600 font-semibold">
            Periodo:
          </label>
          <select
            value={diasComp}
            onChange={(e) => setDiasComp(Number(e.target.value))}
            className="px-3 py-1.5 border border-cyan-300 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-cyan-500"
          >
            <option value={7}>vs hace 7 días</option>
            <option value={14}>vs hace 14 días</option>
            <option value={30}>vs hace 30 días</option>
            <option value={60}>vs hace 60 días</option>
            <option value={90}>vs hace 90 días</option>
          </select>
        </div>
      </div>
    </>
  );
}
