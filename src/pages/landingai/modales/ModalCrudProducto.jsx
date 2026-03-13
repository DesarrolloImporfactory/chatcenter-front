import React, { useState, useRef } from "react";

const FS = { border: "1px solid #e2e8f0", background: "#f8fafc" };

const MONEDAS = [
  { code: "USD", symbol: "$", label: "Dólar (USD)", flag: "🇺🇸" },
  { code: "COP", symbol: "$", label: "Peso COP", flag: "🇨🇴" },
  { code: "MXN", symbol: "$", label: "Peso MXN", flag: "🇲🇽" },
  { code: "PEN", symbol: "S/", label: "Sol PEN", flag: "🇵🇪" },
  { code: "ARS", symbol: "$", label: "Peso ARS", flag: "🇦🇷" },
  { code: "BRL", symbol: "R$", label: "Real BRL", flag: "🇧🇷" },
];

const IDIOMAS = [
  { code: "es", label: "Español", flag: "🇪🇸" },
  { code: "en", label: "English", flag: "🇺🇸" },
  { code: "pt", label: "Português", flag: "🇧🇷" },
  { code: "fr", label: "Français", flag: "🇫🇷" },
  { code: "zh", label: "中文", flag: "🇨🇳" },
];

const MAX_COMBOS = 3;

const Field = ({ label, children }) => (
  <div>
    <label className="block text-[11px] font-semibold text-gray-500 mb-1.5">
      {label}
    </label>
    {children}
  </div>
);

const Spin = () => (
  <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
  </svg>
);

const sanitizePrice = (val) => {
  let clean = val.replace(/[^0-9.]/g, "");
  const parts = clean.split(".");
  if (parts.length > 2) clean = parts[0] + "." + parts.slice(1).join("");
  return clean;
};

const ModalCrudProducto = ({
  open,
  onClose,
  editingProduct,
  form,
  setForm,
  portadaPreview,
  onPortadaChange,
  onRemovePortada,
  saving,
  onSave,
}) => {
  const fileRef = useRef(null);
  const [comboError, setComboError] = useState("");

  if (!open) return null;

  const currentMoneda =
    MONEDAS.find((m) => m.code === (form.moneda || "USD")) || MONEDAS[0];

  // ── Combos helpers ──
  const combos = Array.isArray(form.combos) ? form.combos : [];

  const addCombo = () => {
    if (combos.length >= MAX_COMBOS) {
      setComboError(`Máximo ${MAX_COMBOS} combos`);
      return;
    }
    setComboError("");
    setForm({
      ...form,
      combos: [...combos, { cantidad: "", precio: "" }],
    });
  };

  const updateCombo = (index, field, value) => {
    const updated = [...combos];
    updated[index] = {
      ...updated[index],
      [field]: sanitizePrice(value),
    };
    setForm({ ...form, combos: updated });
  };

  const removeCombo = (index) => {
    setComboError("");
    setForm({ ...form, combos: combos.filter((_, i) => i !== index) });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(15,17,41,0.55)", backdropFilter: "blur(6px)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
        style={{
          background: "white",
          boxShadow: "0 25px 60px rgba(0,0,0,0.2)",
          scrollbarWidth: "thin",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Portada */}
        <div
          className="relative h-32 group cursor-pointer shrink-0"
          style={{ background: "#f1f5f9" }}
          onClick={() => fileRef.current?.click()}
        >
          {portadaPreview ? (
            <>
              <img
                src={portadaPreview}
                alt="Portada"
                className="w-full h-full object-cover"
              />
              <div
                className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ background: "rgba(15,17,41,0.5)" }}
              >
                <div className="flex gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      fileRef.current?.click();
                    }}
                    className="w-9 h-9 rounded-xl grid place-items-center"
                    style={{ background: "rgba(255,255,255,0.9)" }}
                  >
                    <i className="bx bx-image-add text-base text-gray-600" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemovePortada();
                    }}
                    className="w-9 h-9 rounded-xl grid place-items-center"
                    style={{ background: "rgba(239,68,68,0.9)" }}
                  >
                    <i className="bx bx-trash text-base text-white" />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-2 group-hover:bg-gray-100 transition">
              <div
                className="w-11 h-11 rounded-xl grid place-items-center"
                style={{ background: "rgba(99,102,241,0.06)" }}
              >
                <i
                  className="bx bx-image-add text-xl"
                  style={{ color: "#a5b4fc" }}
                />
              </div>
              <p className="text-[11px] font-semibold text-gray-500">
                Imagen de portada
              </p>
              <p className="text-[10px] text-gray-400">
                Opcional · Clic para subir
              </p>
            </div>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onPortadaChange}
          />
        </div>

        <div className="p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-bold text-gray-800">
              {editingProduct ? "Editar producto" : "Nuevo producto"}
            </h2>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg grid place-items-center hover:bg-gray-100 transition"
            >
              <i className="bx bx-x text-lg text-gray-400" />
            </button>
          </div>

          <div className="space-y-4">
            <Field label="Nombre *">
              <input
                type="text"
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                placeholder="Ej: Faja reductora térmica"
                className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none transition focus:ring-2 focus:ring-indigo-200"
                style={FS}
              />
            </Field>

            <Field label="Descripción">
              <textarea
                value={form.descripcion}
                onChange={(e) =>
                  setForm({ ...form, descripcion: e.target.value })
                }
                placeholder="Descripción para contexto de la IA…"
                rows={3}
                className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none resize-none transition focus:ring-2 focus:ring-indigo-200"
                style={FS}
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Marca">
                <input
                  type="text"
                  value={form.marca}
                  onChange={(e) => setForm({ ...form, marca: e.target.value })}
                  placeholder="Ej: ThermoFit"
                  className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none transition focus:ring-2 focus:ring-indigo-200"
                  style={FS}
                />
              </Field>
              <Field label="Precio unitario">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400">
                    {currentMoneda.symbol}
                  </span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={form.precio_unitario}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        precio_unitario: sanitizePrice(e.target.value),
                      })
                    }
                    placeholder="0.00"
                    className="w-full pl-7 pr-3.5 py-2.5 rounded-xl text-sm outline-none transition focus:ring-2 focus:ring-indigo-200"
                    style={FS}
                  />
                </div>
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Moneda">
                <div className="relative">
                  <select
                    value={form.moneda || "USD"}
                    onChange={(e) =>
                      setForm({ ...form, moneda: e.target.value })
                    }
                    className="w-full appearance-none px-3.5 py-2.5 rounded-xl text-sm outline-none transition cursor-pointer focus:ring-2 focus:ring-indigo-200"
                    style={FS}
                  >
                    {MONEDAS.map((m) => (
                      <option key={m.code} value={m.code}>
                        {m.flag} {m.label}
                      </option>
                    ))}
                  </select>
                  <i className="bx bx-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </Field>
              <Field label="Idioma de textos">
                <div className="relative">
                  <select
                    value={form.idioma || "es"}
                    onChange={(e) =>
                      setForm({ ...form, idioma: e.target.value })
                    }
                    className="w-full appearance-none px-3.5 py-2.5 rounded-xl text-sm outline-none transition cursor-pointer focus:ring-2 focus:ring-indigo-200"
                    style={FS}
                  >
                    {IDIOMAS.map((i) => (
                      <option key={i.code} value={i.code}>
                        {i.flag} {i.label}
                      </option>
                    ))}
                  </select>
                  <i className="bx bx-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </Field>
            </div>

            {/* ── Combos ── */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[11px] font-semibold text-gray-500">
                  Combos / ofertas{" "}
                  <span className="font-normal text-gray-400">
                    (hasta {MAX_COMBOS})
                  </span>
                </label>
              </div>
              <div className="space-y-2">
                {combos.map((combo, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 p-2.5 rounded-xl bg-gray-50 border border-gray-100 group"
                  >
                    <div className="flex items-center gap-1 flex-1">
                      <input
                        type="text"
                        inputMode="numeric"
                        value={combo.cantidad}
                        onChange={(e) =>
                          updateCombo(idx, "cantidad", e.target.value)
                        }
                        placeholder="2"
                        className="w-12 border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-indigo-200 bg-white"
                      />
                      <span className="text-xs text-gray-400 font-semibold">
                        x por
                      </span>
                      <div className="relative flex-1">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">
                          {currentMoneda.symbol}
                        </span>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={combo.precio}
                          onChange={(e) =>
                            updateCombo(idx, "precio", e.target.value)
                          }
                          placeholder="50.00"
                          className="w-full border border-gray-200 rounded-lg pl-6 pr-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 bg-white"
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
                {combos.length < MAX_COMBOS && (
                  <button
                    onClick={addCombo}
                    className="w-full flex items-center justify-center gap-2 py-2 rounded-xl border-2 border-dashed border-gray-200 hover:border-indigo-300 text-gray-400 hover:text-indigo-600 text-xs font-semibold transition"
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
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={onClose}
              disabled={saving}
              className="flex-1 py-2.5 rounded-xl text-xs font-semibold transition hover:bg-gray-50 disabled:opacity-50"
              style={{ border: "1px solid #e2e8f0", color: "#64748b" }}
            >
              Cancelar
            </button>
            <button
              onClick={onSave}
              disabled={saving}
              className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white transition active:scale-[0.97] disabled:opacity-50 inline-flex items-center justify-center gap-2"
              style={{
                background: "linear-gradient(135deg, #6366f1, #4f46e5)",
              }}
            >
              {saving && <Spin />}
              {editingProduct ? "Guardar cambios" : "Crear producto"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModalCrudProducto;
