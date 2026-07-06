import React from "react";

export default function ClientForm({ value, onChange }) {
  const v = value || {};

  // ───────── Validación teléfono ─────────
  const telTrim = (v.telefono || "").trim();
  const telEmpiezaConPlus = telTrim.startsWith("+");
  const mostrarErrorPlusTel = telTrim.length > 0 && !telEmpiezaConPlus;

  // Limpia en vivo: solo dígitos y un "+" al inicio (NO añade el + solo)
  const onChangeTelefono = (raw) => {
    let val = raw.replace(/[^\d+]/g, "");
    val = val.replace(/(?!^)\+/g, "");
    onChange({ ...v, telefono: val });
  };
  return (
    <div className="space-y-3 text-xs">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div>
          <label className="text-xs font-medium text-slate-700">Nombre</label>
          <input
            className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-200/60 outline-none transition"
            value={v.nombre || ""}
            onChange={(e) => onChange({ ...v, nombre: e.target.value })}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-700">Apellido</label>
          <input
            className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-200/60 outline-none transition"
            value={v.apellido || ""}
            onChange={(e) => onChange({ ...v, apellido: e.target.value })}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div>
          <label className="text-xs font-medium text-slate-700">Email</label>
          <input
            className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-200/60 outline-none transition"
            value={v.email || ""}
            onChange={(e) => onChange({ ...v, email: e.target.value })}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-700">Celular</label>
          <input
            className={`mt-1 w-full rounded-md border bg-white px-3 py-2 text-xs text-slate-800 outline-none transition focus:ring-2 ${
              mostrarErrorPlusTel
                ? "border-rose-400 focus:border-rose-500 focus:ring-rose-200/60"
                : "border-slate-200 focus:border-blue-500 focus:ring-blue-200/60"
            }`}
            value={v.telefono || ""}
            onChange={(e) => onChangeTelefono(e.target.value)}
            placeholder="Ej: +593 99 123 4567"
            inputMode="tel"
          />

          {/* Aviso informativo (siempre visible) */}
          <p className="mt-1 flex items-center gap-1 text-[11px] text-slate-500">
            <i className="bx bx-info-circle" />
            Escribe el número con la extensión del país. Ej: +593 99 123 4567
          </p>

          {/* Aviso en rojo (solo si falta el +) */}
          {mostrarErrorPlusTel && (
            <p className="mt-1 flex items-center gap-1 text-[11px] font-medium text-rose-600">
              <i className="bx bx-error-circle" />
              El número debe empezar con "+" (incluye el código del país).
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div>
          <label className="text-xs font-medium text-slate-700">
            Chat cerrado
          </label>
          <select
            className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-200/60 outline-none transition"
            value={v.chat_cerrado ?? 0}
            onChange={(e) =>
              onChange({ ...v, chat_cerrado: Number(e.target.value) })
            }
          >
            <option value={0}>No</option>
            <option value={1}>Sí</option>
          </select>
        </div>

        <div>
          <label className="text-xs font-medium text-slate-700">
            Bot OpenIA
          </label>
          <select
            className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-200/60 outline-none transition"
            value={v.bot_openia ?? 1}
            onChange={(e) =>
              onChange({ ...v, bot_openia: Number(e.target.value) })
            }
          >
            <option value={1}>Activo</option>
            <option value={0}>Inactivo</option>
          </select>
        </div>

        <div>
          <label className="text-xs font-medium text-slate-700">
            Pedido confirmado
          </label>
          <select
            className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-200/60 outline-none transition"
            value={v.pedido_confirmado ?? 0}
            onChange={(e) =>
              onChange({ ...v, pedido_confirmado: Number(e.target.value) })
            }
          >
            <option value={0}>No</option>
            <option value={1}>Sí</option>
          </select>
        </div>
      </div>
    </div>
  );
}
