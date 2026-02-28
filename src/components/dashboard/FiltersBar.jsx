import React from "react";
import DateRangePicker from "./DataRangePicker";

function Select({ label, value, options = [], onChange }) {
  return (
    <div className="min-w-[165px]">
      <div className="mb-1 text-[11px] font-medium text-slate-500">{label}</div>

      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="
          h-[42px] w-full rounded-xl
          border border-slate-200 bg-white
          px-3 text-sm text-slate-900
          outline-none
          focus:border-[#2b7cff] focus:ring-2 focus:ring-[#2b7cff]/15
        "
      >
        {options.map((o) => (
          <option key={o} value={o} className="bg-white">
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}

export default function FiltersBar({ filters, options, onChange, onApply }) {
  const opts = options || {
    departments: ["Todos"],
    users: ["Todos"],
    connections: ["Todas"],
    tags: ["Todas"],
    motives: ["Todos"],
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-end gap-3">
        {/* Filtros en una sola fila (con scroll si no cabe) */}
        <div className="flex flex-1 items-end gap-3 overflow-x-auto pb-1">
          <Select
            label="Departamentos"
            value={filters.department}
            options={opts.departments}
            onChange={(v) => onChange((prev) => ({ ...prev, department: v }))}
          />

          <Select
            label="Usuarios"
            value={filters.user}
            options={opts.users}
            onChange={(v) => onChange((prev) => ({ ...prev, user: v }))}
          />

          <Select
            label="Conexiones"
            value={filters.connection}
            options={opts.connections}
            onChange={(v) => onChange((prev) => ({ ...prev, connection: v }))}
          />

          <Select
            label="Etiquetas"
            value={filters.tag}
            options={opts.tags}
            onChange={(v) => onChange((prev) => ({ ...prev, tag: v }))}
          />

          <Select
            label="Motivos"
            value={filters.motive}
            options={opts.motives}
            onChange={(v) => onChange((prev) => ({ ...prev, motive: v }))}
          />

          {/* ✅ ahora DateRangePicker trabaja con {from,to} */}
          <DateRangePicker
            value={filters.dateRange}
            onChange={(range) =>
              onChange((prev) => ({ ...prev, dateRange: range }))
            }
          />
        </div>

        {/* Botón a la derecha en la misma fila */}
        <button
          onClick={onApply}
          className="
            h-[42px] shrink-0 rounded-xl
            bg-[#2b7cff] px-5 text-sm font-semibold text-white
            shadow-sm hover:brightness-95 active:scale-[0.99]
          "
          title="Aplicar filtros"
          type="button"
        >
          Aplicar filtros
        </button>
      </div>

      <div className="mt-2 text-[11px] text-slate-400">
        Use los filtros para segmentar indicadores y métricas del chat center.
      </div>
    </div>
  );
}
