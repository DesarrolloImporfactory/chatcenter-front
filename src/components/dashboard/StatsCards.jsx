import React from "react";

// ===== Helpers UI =====
function pct(n, total) {
  if (!total) return 0;
  return Math.round((n / total) * 1000) / 10;
}

function formatDuration(seconds) {
  if (seconds === null || seconds === undefined) return "Sin datos";
  const s = Math.max(0, Number(seconds) || 0);

  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;

  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m} min`;
  return `${sec} seg`;
}

function Card({ icon, title, value, subtitle, badge, badgeColor = "blue" }) {
  const badgeColors = {
    blue: "bg-blue-100 text-blue-700 border-blue-200",
    green: "bg-green-100 text-green-700 border-green-200",
    amber: "bg-amber-100 text-amber-700 border-amber-200",
    rose: "bg-rose-100 text-rose-700 border-rose-200",
    slate: "bg-slate-100 text-slate-700 border-slate-200",
  };

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 text-slate-700 transition-all group-hover:from-blue-100 group-hover:to-blue-200 group-hover:text-blue-700">
              <i className={`bx ${icon} text-2xl`}></i>
            </div>
            <div>
              <div className="text-sm font-medium text-slate-600">{title}</div>
              <div className="mt-1 text-3xl font-bold text-slate-900">
                {value}
              </div>
            </div>
          </div>
          {subtitle && (
            <div className="mt-3 text-xs leading-relaxed text-slate-500">
              {subtitle}
            </div>
          )}
        </div>
        {badge && (
          <div
            className={`rounded-lg border px-3 py-1 text-xs font-semibold ${badgeColors[badgeColor]}`}
          >
            {badge}
          </div>
        )}
      </div>
    </div>
  );
}

function TimeCard({ icon, title, value, explanation, color = "blue" }) {
  const colorClasses = {
    blue: {
      gradient: "from-blue-600 to-blue-700",
      shadow: "shadow-blue-600/30",
      bg: "bg-gradient-to-br from-blue-50 to-blue-100/50",
      border: "border-blue-200",
      text: "text-blue-700",
    },
    green: {
      gradient: "from-green-600 to-green-700",
      shadow: "shadow-green-600/30",
      bg: "bg-gradient-to-br from-green-50 to-green-100/50",
      border: "border-green-200",
      text: "text-green-700",
    },
    amber: {
      gradient: "from-amber-600 to-amber-700",
      shadow: "shadow-amber-600/30",
      bg: "bg-gradient-to-br from-amber-50 to-amber-100/50",
      border: "border-amber-200",
      text: "text-amber-700",
    },
  };

  const colors = colorClasses[color] || colorClasses.blue;

  return (
    <div
      className={`rounded-2xl border ${colors.border} ${colors.bg} p-6 shadow-sm transition-all hover:shadow-md`}
    >
      <div className="flex items-start gap-4">
        <div
          className={`flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br ${colors.gradient} shadow-lg ${colors.shadow}`}
        >
          <i className={`bx ${icon} text-3xl text-white`}></i>
        </div>
        <div className="flex-1">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-600">
            {title}
          </div>
          <div className="mt-2 text-4xl font-bold text-slate-900">{value}</div>
          {explanation && (
            <div className={`mt-3 text-xs leading-relaxed ${colors.text}`}>
              {explanation}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoBox({ title, children }) {
  return (
    <div className="rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50 to-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white shadow-md shadow-blue-600/30">
          <i className="bx bx-info-circle text-lg"></i>
        </div>
        <div className="flex-1">
          <div className="text-sm font-semibold text-blue-900">{title}</div>
          <div className="mt-2 space-y-2 text-xs text-blue-800">{children}</div>
        </div>
      </div>
    </div>
  );
}

export default function StatsCards({ summary }) {
  const chatsCreated = Number(summary?.chatsCreated || 0);
  const chatsResolved = Number(summary?.chatsResolved || 0);
  const withReplies = Number(summary?.withReplies || 0);
  const noReply = Number(summary?.noReply || 0);
  const avgFirstResponseSeconds = summary?.avgFirstResponseSeconds;
  const avgResolutionSeconds = summary?.avgResolutionSeconds;

  const totalFirstIn = withReplies + noReply;
  const responsePct = pct(withReplies, totalFirstIn);
  const noReplyPct = pct(noReply, totalFirstIn);

  // Determinar color según rendimiento
  const getResponseColor = (seconds) => {
    if (seconds === null || seconds === undefined) return "blue";
    if (seconds < 300) return "green";
    if (seconds < 600) return "blue";
    return "amber";
  };

  const getResolutionColor = (seconds) => {
    if (seconds === null || seconds === undefined) return "blue";
    if (seconds < 1800) return "green";
    if (seconds < 3600) return "blue";
    return "amber";
  };

  return (
    <div className="space-y-6">
      {/* Fila 1: Métricas principales */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card
          icon="bx-message-square-add"
          title="Chats Creados"
          value={chatsCreated.toLocaleString()}
          subtitle="Nuevas conversaciones iniciadas por clientes en el período seleccionado"
          badge="Total"
          badgeColor="blue"
        />

        <Card
          icon="bx-message-square-check"
          title="Chats Resueltos"
          value={chatsResolved.toLocaleString()}
          subtitle="Conversaciones que fueron cerradas exitosamente por el equipo"
          badge="Cerrados"
          badgeColor="green"
        />

        <Card
          icon="bx-message-square-dots"
          title="Con Respuesta"
          value={withReplies.toLocaleString()}
          subtitle={`El equipo respondió en ${responsePct}% de las conversaciones iniciadas`}
          badge={`${responsePct}%`}
          badgeColor={
            responsePct >= 80 ? "green" : responsePct >= 60 ? "amber" : "rose"
          }
        />

        <Card
          icon="bx-message-square-x"
          title="Sin Respuesta"
          value={noReply.toLocaleString()}
          subtitle={`${noReplyPct}% de las conversaciones no recibieron respuesta del equipo`}
          badge={`${noReplyPct}%`}
          badgeColor={
            noReplyPct <= 20 ? "green" : noReplyPct <= 40 ? "amber" : "rose"
          }
        />
      </div>

      {/* Fila 2: Métricas de tiempo */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <TimeCard
          icon="bx-time-five"
          title="Tiempo de Primera Respuesta"
          value={formatDuration(avgFirstResponseSeconds)}
          explanation={
            avgFirstResponseSeconds === null ||
            avgFirstResponseSeconds === undefined
              ? "No hay suficientes datos en este período para calcular el promedio"
              : avgFirstResponseSeconds < 300
                ? "Excelente: El equipo responde en menos de 5 minutos"
                : avgFirstResponseSeconds < 600
                  ? "Buen rendimiento: Respuestas en menos de 10 minutos"
                  : "Oportunidad de mejora: Los clientes esperan más de 10 minutos"
          }
          color={getResponseColor(avgFirstResponseSeconds)}
        />

        <TimeCard
          icon="bx-check-circle"
          title="Tiempo de Resolución"
          value={formatDuration(avgResolutionSeconds)}
          explanation={
            avgResolutionSeconds === null || avgResolutionSeconds === undefined
              ? "No hay chats resueltos en este período para calcular el promedio"
              : avgResolutionSeconds < 1800
                ? "Excelente: Los problemas se resuelven en menos de 30 minutos"
                : avgResolutionSeconds < 3600
                  ? "Buen rendimiento: Resoluciones en menos de 1 hora"
                  : "Oportunidad de mejora: Las resoluciones toman más de 1 hora"
          }
          color={getResolutionColor(avgResolutionSeconds)}
        />
      </div>

      {/* Explicación de métricas */}
      <InfoBox title="Cómo se calculan estas métricas">
        <div className="flex items-start gap-2">
          <i className="bx bx-radio-circle-marked mt-0.5 text-blue-600"></i>
          <div>
            <strong>Tiempo de Primera Respuesta:</strong> Promedio del tiempo
            transcurrido desde que el cliente envía su primer mensaje hasta que
            el equipo responde por primera vez.
          </div>
        </div>
        <div className="flex items-start gap-2">
          <i className="bx bx-radio-circle-marked mt-0.5 text-blue-600"></i>
          <div>
            <strong>Tiempo de Resolución:</strong> Promedio del tiempo total
            desde que el cliente inicia la conversación hasta que el equipo
            marca el chat como cerrado.
          </div>
        </div>
        <div className="flex items-start gap-2">
          <i className="bx bx-radio-circle-marked mt-0.5 text-blue-600"></i>
          <div>
            <strong>Con/Sin Respuesta:</strong> De todos los chats donde el
            cliente escribió primero, cuántos recibieron al menos una respuesta
            del equipo vs cuántos quedaron sin atender.
          </div>
        </div>
      </InfoBox>
    </div>
  );
}
