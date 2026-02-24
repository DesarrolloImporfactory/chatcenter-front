/**
 * Sub-componente: Inputs de placeholders de la plantilla.
 */

import React from "react";

export default function TemplatePlaceholders({
  values = {},
  onChange,
  headerFile,
  onHeaderFileChange,
}) {
  const bodyKeys = Object.keys(values).filter((k) => k.startsWith("body_"));

  const handleChange = (key, val) => {
    onChange({ ...values, [key]: val });
  };

  return (
    <div className="space-y-3">
      {bodyKeys.length > 0 && (
        <>
          <label className="block text-sm font-semibold text-slate-700">
            Variables del cuerpo
          </label>
          {bodyKeys.map((key) => (
            <div key={key}>
              <label className="text-xs text-slate-500 mb-1 block">
                {`{{${key.replace("body_", "")}}}`}
              </label>
              <input
                type="text"
                value={values[key] || ""}
                onChange={(e) => handleChange(key, e.target.value)}
                placeholder={`Valor para ${key}`}
                className="w-full rounded-xl border border-slate-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          ))}
        </>
      )}

      {/* Header file upload */}
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-1">
          Archivo de encabezado (opcional)
        </label>
        <input
          type="file"
          onChange={(e) => onHeaderFileChange(e.target.files?.[0] || null)}
          className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
        />
        {headerFile && (
          <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
            <i className="bx bx-file" />
            {headerFile.name || "Archivo seleccionado"}
            <button
              onClick={() => onHeaderFileChange(null)}
              className="text-red-500 hover:text-red-700"
            >
              ✕
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
