import React from "react";

export default function ClientForm({ value, onChange }) {
  const v = value || {};
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
            className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-200/60 outline-none transition"
            value={v.telefono || ""}
            onChange={(e) => onChange({ ...v, telefono: e.target.value })}
          />
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
