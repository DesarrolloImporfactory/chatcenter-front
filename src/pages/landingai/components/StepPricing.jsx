import React, { useState } from "react";

const MAX_COMBOS = 3;

const MONEDAS = [
  { code: "USD", symbol: "$", label: "Dólar (USD)", flag: "🇺🇸" },
  { code: "COP", symbol: "$", label: "Peso Colombiano (COP)", flag: "🇨🇴" },
  { code: "MXN", symbol: "$", label: "Peso Mexicano (MXN)", flag: "🇲🇽" },
  { code: "PEN", symbol: "S/", label: "Sol Peruano (PEN)", flag: "🇵🇪" },
  { code: "ARS", symbol: "$", label: "Peso Argentino (ARS)", flag: "🇦🇷" },
  { code: "BRL", symbol: "R$", label: "Real Brasileño (BRL)", flag: "🇧🇷" },
];

const IDIOMAS = [
  { code: "es", label: "Español", flag: "🇪🇸" },
  { code: "en", label: "English", flag: "🇺🇸" },
  { code: "pt", label: "Português", flag: "🇧🇷" },
  { code: "fr", label: "Français", flag: "🇫🇷" },
  { code: "zh", label: "中文 (Chino)", flag: "🇨🇳" },
];

const StepPricing = ({
  description,
  setDescription,
  pricing,
  setPricing,
  marca,
  setMarca,
  moneda,
  setMoneda,
  idioma,
  setIdioma,
  onBack,
  onContinue,
}) => {
  const [comboError, setComboError] = useState("");

  const currentMoneda = MONEDAS.find((m) => m.code === moneda) || MONEDAS[0];

  // Helper: solo permite números positivos y un punto decimal
  const sanitizePrice = (val) => {
    // Quita todo excepto dígitos y punto
    let clean = val.replace(/[^0-9.]/g, "");
    // Solo un punto decimal
    const parts = clean.split(".");
    if (parts.length > 2) clean = parts[0] + "." + parts.slice(1).join("");
    return clean;
  };

  const handlePrecioChange = (val) => {
    setPricing((prev) => ({ ...prev, precio_unitario: sanitizePrice(val) }));
  };

  const addCombo = () => {
    if (pricing.combos.length >= MAX_COMBOS) {
      setComboError(`Máximo ${MAX_COMBOS} combos`);
      return;
    }
    setComboError("");
    setPricing((prev) => ({
      ...prev,
      combos: [...prev.combos, { cantidad: "", precio: "" }],
    }));
  };

  const updateCombo = (index, field, value) => {
    setPricing((prev) => {
      const combos = [...prev.combos];
      combos[index] = {
        ...combos[index],
        [field]:
          field === "cantidad" || field === "precio"
            ? sanitizePrice(value)
            : value,
      };
      return { ...prev, combos };
    });
  };

  const removeCombo = (index) => {
    setComboError("");
    setPricing((prev) => ({
      ...prev,
      combos: prev.combos.filter((_, i) => i !== index),
    }));
  };

  const canContinue =
    description.trim().length >= 5 && marca.trim().length >= 1;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 grid place-items-center shrink-0 shadow-lg shadow-indigo-500/20">
          <i className="bx bx-package text-white text-lg" />
        </div>
        <div>
          <h2 className="font-bold text-gray-900 text-sm">
            Detalla tu producto
          </h2>
          <p className="text-[11px] text-gray-400 mt-0.5">
            Esta información será usada por la IA para generar ángulos de venta
            y textos precisos
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* ── Col izquierda: Descripción ── */}
        <div className="lg:col-span-3 space-y-4">
          <div>
            <div className="mb-3">
              <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Nombre del Producto <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={marca}
                onChange={(e) => setMarca(e.target.value)}
                placeholder="Ej: HydraSkin, ImportaYa, Mi Tienda..."
                className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-800 placeholder-gray-300 bg-gray-50 focus:bg-white transition"
              />
            </div>
            <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Descripción del producto
              <span className="text-rose-400">*</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              placeholder="Ej: Crema hidratante premium de la marca HydraSkin. Presentación de 120ml, colores azul y blanco. Ideal para piel seca y sensible. Público femenino 25-45 años. Contiene ácido hialurónico y vitamina E..."
              className="w-full border border-gray-200 rounded-xl px-3.5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none text-gray-800 placeholder-gray-300 bg-gray-50 focus:bg-white transition"
            />
            <p className="text-[10px] text-gray-400 mt-1.5">
              <i className="bx bx-info-circle mr-1" />
              Mientras más detallado, mejor serán los ángulos de venta y las
              imágenes generadas
            </p>
          </div>

          {/* ── Moneda + Idioma ── */}
          <div className="grid grid-cols-2 gap-3">
            {/* Moneda */}
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-2">
                <i className="bx bx-coin-stack mr-1 text-xs" />
                Moneda
              </label>
              <div className="relative">
                <select
                  value={moneda}
                  onChange={(e) => setMoneda(e.target.value)}
                  className="w-full appearance-none border border-gray-200 rounded-xl pl-10 pr-8 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-800 bg-gray-50 focus:bg-white transition cursor-pointer"
                >
                  {MONEDAS.map((m) => (
                    <option key={m.code} value={m.code}>
                      {m.flag} {m.label}
                    </option>
                  ))}
                </select>
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-base pointer-events-none">
                  {currentMoneda.flag}
                </span>
                <i className="bx bx-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Idioma */}
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-2">
                <i className="bx bx-globe mr-1 text-xs" />
                Idioma de textos
              </label>
              <div className="relative">
                <select
                  value={idioma}
                  onChange={(e) => setIdioma(e.target.value)}
                  className="w-full appearance-none border border-gray-200 rounded-xl pl-10 pr-8 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-800 bg-gray-50 focus:bg-white transition cursor-pointer"
                >
                  {IDIOMAS.map((i) => (
                    <option key={i.code} value={i.code}>
                      {i.flag} {i.label}
                    </option>
                  ))}
                </select>
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-base pointer-events-none">
                  {IDIOMAS.find((i) => i.code === idioma)?.flag || "🌐"}
                </span>
                <i className="bx bx-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>

        {/* ── Col derecha: Precios ── */}
        <div className="lg:col-span-2 space-y-4">
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Precio unitario{" "}
              <span className="font-normal text-gray-400 normal-case">
                (recomendado)
              </span>
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400">
                {currentMoneda.symbol}
              </span>
              <input
                type="text"
                inputMode="decimal"
                value={pricing.precio_unitario}
                onChange={(e) => handlePrecioChange(e.target.value)}
                placeholder="29.99"
                className="w-full border border-gray-200 rounded-xl pl-8 pr-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-800 placeholder-gray-300 bg-gray-50 focus:bg-white transition"
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-gray-400">
                {moneda}
              </span>
            </div>
          </div>

          {/* Combos */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                Combos / ofertas{" "}
                <span className="font-normal text-gray-400 normal-case">
                  (hasta {MAX_COMBOS})
                </span>
              </label>
            </div>

            <div className="space-y-2">
              {pricing.combos.map((combo, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 p-2.5 rounded-xl bg-gray-50 border border-gray-100 group"
                >
                  <div className="flex items-center gap-1 flex-1">
                    <input
                      type="text"
                      value={combo.cantidad}
                      onChange={(e) =>
                        updateCombo(idx, "cantidad", e.target.value)
                      }
                      placeholder="2"
                      className="w-14 border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                    />
                    <span className="text-xs text-gray-400 font-semibold">
                      x
                    </span>
                    <span className="text-xs text-gray-400 font-semibold">
                      por
                    </span>
                    <div className="relative flex-1">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">
                        {currentMoneda.symbol}
                      </span>
                      <input
                        type="text"
                        value={combo.precio}
                        onChange={(e) =>
                          updateCombo(idx, "precio", e.target.value)
                        }
                        placeholder="50.00"
                        className="w-full border border-gray-200 rounded-lg pl-6 pr-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                      />
                    </div>
                  </div>
                  <button
                    onClick={() => removeCombo(idx)}
                    className="w-7 h-7 rounded-lg bg-white border border-gray-200 hover:bg-rose-50 hover:border-rose-200 grid place-items-center transition opacity-0 group-hover:opacity-100"
                  >
                    <i className="bx bx-trash text-xs text-rose-400" />
                  </button>
                </div>
              ))}

              {pricing.combos.length < MAX_COMBOS && (
                <button
                  onClick={addCombo}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed border-gray-200 hover:border-indigo-300 text-gray-400 hover:text-indigo-600 text-xs font-semibold transition"
                >
                  <i className="bx bx-plus text-sm" /> Agregar combo
                </button>
              )}
              {comboError && (
                <p className="text-[10px] text-rose-500 font-medium">
                  {comboError}
                </p>
              )}
            </div>

            {/* Preview de precios */}
            {(pricing.precio_unitario ||
              pricing.combos.some((c) => c.cantidad && c.precio)) && (
              <div className="mt-3 p-2.5 rounded-xl bg-indigo-50/60 border border-indigo-100">
                <p className="text-[10px] font-bold text-indigo-600 mb-1">
                  <i className="bx bx-tag-alt mr-1" />
                  La IA usará estos precios ({moneda}):
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {pricing.precio_unitario && (
                    <span className="px-2 py-0.5 rounded-md bg-white border border-indigo-100 text-[10px] font-semibold text-gray-700">
                      1x {currentMoneda.symbol}
                      {pricing.precio_unitario}
                    </span>
                  )}
                  {pricing.combos
                    .filter((c) => c.cantidad && c.precio)
                    .map((c, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded-md bg-white border border-indigo-100 text-[10px] font-semibold text-gray-700"
                      >
                        {c.cantidad}x {currentMoneda.symbol}
                        {c.precio}
                      </span>
                    ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-4 mt-5 border-t border-gray-100">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 text-gray-600 text-xs font-semibold hover:bg-gray-50 transition"
        >
          <i className="bx bx-left-arrow-alt text-base" /> Atrás
        </button>
        <button
          onClick={onContinue}
          disabled={!canContinue}
          className={`inline-flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold transition ${
            canContinue
              ? "bg-indigo-600 text-white hover:bg-indigo-700"
              : "bg-gray-100 text-gray-400 cursor-not-allowed"
          }`}
        >
          Generar ángulos de venta{" "}
          <i className="bx bx-right-arrow-alt text-base" />
        </button>
      </div>
    </div>
  );
};

export default StepPricing;
