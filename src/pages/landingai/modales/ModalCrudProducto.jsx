import React, { useRef } from "react";

const F = { border: "1px solid #e2e8f0", background: "#f8fafc" };

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

/**
 * Props:
 *   open, onClose, editingProduct,
 *   form, setForm,
 *   portadaPreview, onPortadaChange, onRemovePortada,
 *   saving, onSave
 */
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
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(15,17,41,0.55)", backdropFilter: "blur(6px)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl overflow-hidden"
        style={{
          background: "white",
          boxShadow: "0 25px 60px rgba(0,0,0,0.2)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Portada */}
        <div
          className="relative h-32 group cursor-pointer"
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
                className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none transition"
                style={F}
                onFocus={(e) => (e.target.style.borderColor = "#6366f1")}
                onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
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
                className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none resize-none transition"
                style={F}
                onFocus={(e) => (e.target.style.borderColor = "#6366f1")}
                onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Marca">
                <input
                  type="text"
                  value={form.marca}
                  onChange={(e) => setForm({ ...form, marca: e.target.value })}
                  placeholder="Ej: ThermoFit"
                  className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none transition"
                  style={F}
                  onFocus={(e) => (e.target.style.borderColor = "#6366f1")}
                  onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
                />
              </Field>
              <Field label="Moneda">
                <select
                  value={form.moneda}
                  onChange={(e) => setForm({ ...form, moneda: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none"
                  style={F}
                >
                  {["USD", "COP", "MXN", "PEN", "BRL"].map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </Field>
            </div>

            <Field label="Precio unitario">
              <input
                type="number"
                step="0.01"
                value={form.precio_unitario}
                onChange={(e) =>
                  setForm({ ...form, precio_unitario: e.target.value })
                }
                placeholder="0.00"
                className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none transition"
                style={F}
                onFocus={(e) => (e.target.style.borderColor = "#6366f1")}
                onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
              />
            </Field>
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
