import React from "react";

// ===== Helpers UI =====
function pct(n, total) {
  if (!total) return 0;
  return Math.round((n / total) * 1000) / 10; // 1 decimal
}

function formatDuration(seconds) {
  if (seconds === null || seconds === undefined) return "N/A";
  const s = Math.max(0, Number(seconds) || 0);

  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);

  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function Badge({ children }) {
  return (
    <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-700">
      {children}
    </span>
  );
}

function Card({ title, value, subtitle, hint }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-3xl font-semibold text-slate-900">{value}</div>
          <div className="mt-1 text-sm font-medium text-slate-700">{title}</div>
          {subtitle ? (
            <div className="mt-2 text-xs text-slate-500">{subtitle}</div>
          ) : null}
        </div>
        {hint ? <Badge>{hint}</Badge> : null}
      </div>
    </div>
  );
}

export default function StatsCards({ summary }) {
  const chatsCreated = Number(summary?.chatsCreated || 0);
  const chatsResolved = Number(summary?.chatsResolved || 0);
  const withReplies = Number(summary?.withReplies || 0);
  const noReply = Number(summary?.noReply || 0);

  const totalFirstIn = withReplies + noReply;

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      <Card
        title="Chats creados"
        value={chatsCreated}
        subtitle="Contactos creados en el rango"
        hint="Total"
      />

      <Card
        title="Chats resueltos"
        value={chatsResolved}
        subtitle="Chats marcados como cerrados"
        hint="Cerrados"
      />

      <Card
        title="Con respuesta"
        value={withReplies}
        subtitle={`% sobre conversaciones: ${pct(withReplies, totalFirstIn)}%`}
        hint="OUT detectado"
      />

      <Card
        title="Sin respuesta"
        value={noReply}
        subtitle={`% sobre conversaciones: ${pct(noReply, totalFirstIn)}%`}
        hint="Sin OUT"
      />

      <div className="md:col-span-2 xl:col-span-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-xs font-medium text-slate-500">
                Tiempo promedio de primera respuesta
              </div>
              <div className="mt-1 text-3xl font-semibold text-[#2b7cff]">
                {formatDuration(summary?.avgFirstResponseSeconds)}
              </div>
              <div className="mt-1 text-xs text-slate-500">
                Si aparece N/A, es porque aún no hay datos suficientes o no se
                pudo calcular.
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              <div className="text-[11px] text-slate-500">Próximo</div>
              <div className="mt-1 font-semibold text-slate-700">
                Tiempo de resolución
              </div>
              <div className="mt-1 text-xs text-slate-500">
                Pendiente de implementar (chat_cerrado_at)
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
