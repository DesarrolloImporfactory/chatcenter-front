/**
 * Sub-componente: Programación de envío de plantilla.
 */

import React from "react";

const TIMEZONES = [
  { value: "America/Guayaquil", label: "Ecuador (GMT-5)" },
  { value: "America/Bogota", label: "Colombia (GMT-5)" },
  { value: "America/Lima", label: "Perú (GMT-5)" },
  { value: "America/Mexico_City", label: "México (GMT-6)" },
  { value: "America/Santiago", label: "Chile (GMT-4)" },
  { value: "America/Buenos_Aires", label: "Argentina (GMT-3)" },
  { value: "America/New_York", label: "US Eastern (GMT-5)" },
  { value: "Europe/Madrid", label: "España (GMT+1)" },
];

export default function TemplateScheduler({
  enabled,
  onToggle,
  fecha,
  onFechaChange,
  timezone,
  onTimezoneChange,
}) {
  return (
    <div className="space-y-3">
      {/* Toggle */}
      <label className="flex items-center gap-3 cursor-pointer">
        <div
          onClick={onToggle}
          className={`w-11 h-6 flex items-center rounded-full px-0.5 transition-colors
            ${enabled ? "bg-indigo-500" : "bg-slate-300"}`}
        >
          <div
            className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform
              ${enabled ? "translate-x-5" : "translate-x-0"}`}
          />
        </div>
        <span className="text-sm font-medium text-slate-700">
          Programar envío
        </span>
      </label>

      {/* Campos de programación */}
      {enabled && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              Fecha y hora
            </label>
            <input
              type="datetime-local"
              value={fecha}
              onChange={(e) => onFechaChange(e.target.value)}
              min={new Date().toISOString().slice(0, 16)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              Zona horaria
            </label>
            <select
              value={timezone}
              onChange={(e) => onTimezoneChange(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {TIMEZONES.map((tz) => (
                <option key={tz.value} value={tz.value}>
                  {tz.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  );
}
