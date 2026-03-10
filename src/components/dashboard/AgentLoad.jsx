import React from "react";

function getBarColor(index) {
  const palette = [
    "bg-blue-500",
    "bg-emerald-500",
    "bg-amber-500",
    "bg-rose-500",
    "bg-violet-500",
    "bg-cyan-500",
    "bg-orange-500",
    "bg-teal-500",
    "bg-pink-500",
    "bg-indigo-500",
    "bg-lime-500",
    "bg-fuchsia-500",
  ];
  return palette[index % palette.length];
}

function getAvatarColor(index) {
  const palette = [
    "from-blue-500 to-blue-600",
    "from-emerald-500 to-emerald-600",
    "from-amber-500 to-amber-600",
    "from-rose-500 to-rose-600",
    "from-violet-500 to-violet-600",
    "from-cyan-500 to-cyan-600",
    "from-orange-500 to-orange-600",
    "from-teal-500 to-teal-600",
    "from-pink-500 to-pink-600",
    "from-indigo-500 to-indigo-600",
  ];
  return palette[index % palette.length];
}

function getInitials(name) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function AgentLoad({ data = [] }) {
  const maxChats = Math.max(...data.map((a) => a.total_chats || 0), 1);
  const totalChats = data.reduce((s, a) => s + (a.total_chats || 0), 0);
  const activeAgents = data.filter((a) => (a.total_chats || 0) > 0).length;
  const totalAbiertos = data.reduce(
    (s, a) => s + (a.chats_abiertos_ahora || 0),
    0,
  );

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      {/* Header */}
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-blue-700 shadow-sm">
            <i className="bx bx-group text-base text-white"></i>
          </div>
          <div>
            <h3 className="text-sm font-semibold tracking-wide text-slate-700">
              CARGA POR ASESOR
            </h3>
            <p className="text-xs text-slate-400">
              Chats atendidos en el período seleccionado
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-lg font-bold text-slate-800">{totalChats}</div>
            <div className="text-[10px] uppercase tracking-wider text-slate-400">
              total rango
            </div>
          </div>
          <div className="h-8 w-px bg-slate-200"></div>
          <div className="text-right">
            <div className="text-lg font-bold text-emerald-600">
              {activeAgents}
            </div>
            <div className="text-[10px] uppercase tracking-wider text-slate-400">
              con actividad
            </div>
          </div>
          <div className="h-8 w-px bg-slate-200"></div>
          {/* ← NUEVO */}
          <div className="text-right">
            <div className="text-lg font-bold text-rose-600">
              {totalAbiertos}
            </div>
            <div className="text-[10px] uppercase tracking-wider text-slate-400">
              abiertos ahora
            </div>
          </div>
        </div>
      </div>

      {/* Agent list */}
      <div className="max-h-[400px] space-y-2.5 overflow-auto pr-1">
        {data.map((agent, i) => {
          const chats = agent.total_chats || 0;
          const pct = maxChats > 0 ? (chats / maxChats) * 100 : 0;

          return (
            <div
              key={agent.id_sub_usuario}
              className="group flex items-center gap-3 rounded-xl border border-slate-100 px-3.5 py-2.5 transition hover:border-slate-200 hover:bg-slate-50/60"
            >
              {/* Avatar */}
              <div
                className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${getAvatarColor(i)} text-xs font-bold text-white shadow-sm`}
              >
                {getInitials(agent.nombre_encargado)}
              </div>
              {/* Info + bar */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-slate-700 truncate">
                    {agent.nombre_encargado || "Sin nombre"}
                  </span>
                  {/* Dos métricas */}
                  <div className="ml-2 flex flex-shrink-0 items-center gap-2">
                    <span className="text-[11px] text-slate-400">rango</span>
                    <span
                      className={`text-sm font-bold tabular-nums ${chats === 0 ? "text-slate-300" : "text-slate-800"}`}
                    >
                      {chats}
                    </span>
                    <span className="h-3 w-px bg-slate-200"></span>
                    <span className="text-[11px] text-slate-400">abiertos</span>
                    <span
                      className={`text-sm font-bold tabular-nums ${
                        (agent.chats_abiertos_ahora || 0) > 20
                          ? "text-rose-600"
                          : (agent.chats_abiertos_ahora || 0) > 10
                            ? "text-amber-500"
                            : (agent.chats_abiertos_ahora || 0) > 0
                              ? "text-emerald-600"
                              : "text-slate-300"
                      }`}
                    >
                      {agent.chats_abiertos_ahora || 0}
                    </span>
                  </div>
                </div>

                {/* Barra basada en chats del rango */}
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${getBarColor(i)}`}
                    style={{ width: `${pct}%` }}
                  ></div>
                </div>
              </div>
            </div>
          );
        })}

        {data.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 text-slate-400">
            <i className="bx bx-user-x text-4xl mb-2"></i>
            <span className="text-sm">No hay asesores registrados</span>
          </div>
        )}
      </div>
    </div>
  );
}
