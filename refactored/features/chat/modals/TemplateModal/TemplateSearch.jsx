/**
 * Sub-componente: Búsqueda y selección de plantilla.
 */

import React from "react";

const LANGUAGES = [
  { code: "es", label: "Español" },
  { code: "en", label: "English" },
  { code: "pt_BR", label: "Português" },
];

export default function TemplateSearch({
  value,
  onChange,
  language,
  onLanguageChange,
}) {
  return (
    <div className="space-y-3">
      <label className="block text-sm font-semibold text-slate-700">
        Plantilla
      </label>

      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Nombre de la plantilla..."
        className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />

      <div className="flex gap-2">
        {LANGUAGES.map((lang) => (
          <button
            key={lang.code}
            onClick={() => onLanguageChange(lang.code)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition
              ${
                language === lang.code
                  ? "bg-indigo-50 border-indigo-300 text-indigo-700"
                  : "border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
          >
            {lang.label}
          </button>
        ))}
      </div>
    </div>
  );
}
