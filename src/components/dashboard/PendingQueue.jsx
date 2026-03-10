import React from "react";
import { classNames, formatDuration } from "../../utils/parseEventDef";

const CHAT_ROUTE = "/chat";

function PriorityPill({ value }) {
  const map = {
    Alta: "bg-rose-50 text-rose-700 border-rose-200",
    Media: "bg-amber-50 text-amber-700 border-amber-200",
    Baja: "bg-emerald-50 text-emerald-700 border-emerald-200",
  };

  return (
    <span
      className={classNames(
        "inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium",
        map[value] || map.Media,
      )}
    >
      ● {value}
    </span>
  );
}

function ChannelBadge({ value }) {
  const v = (value ?? "").toString().toLowerCase();

  const label =
    v === "wa"
      ? "WhatsApp"
      : v === "ig"
        ? "Instagram"
        : v === "ms"
          ? "Messenger"
          : value;

  const map = {
    whatsapp: "text-emerald-700",
    instagram: "text-amber-700",
    messenger: "text-sky-700",
    ms: "text-sky-700",
    wa: "text-emerald-700",
    ig: "text-amber-700",
  };

  return (
    <span
      className={classNames("text-sm font-medium", map[v] || "text-slate-700")}
    >
      {label}
    </span>
  );
}

export default function PendingQueue({ rows = [] }) {
  const openChatById = (row) => {
    const chatId =
      typeof row === "object" ? (row?.id_cliente_chat_center ?? row?.id) : row;

    if (!chatId) return;

    // Setear en localStorage para que el chat lo encuentre
    const idConfig = row?.id_configuracion;
    if (idConfig) {
      localStorage.setItem("id_configuracion", idConfig);
    }

    const url = `${window.location.origin}${CHAT_ROUTE}/${chatId}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="mb-4 flex items-center justify-between">
        <div className="text-sm font-semibold tracking-wide text-slate-700">
          • COLA DE CHATS PENDIENTES
        </div>
        <div className="text-xs text-slate-400">Actualizado: ahora</div>
      </div>

      <div className="max-h-[420px] overflow-auto rounded-xl border border-slate-200">
        <table className="w-full min-w-[720px] border-collapse">
          <thead className="sticky top-0 bg-slate-50 z-10">
            <tr className="text-left text-xs text-slate-500">
              <th className="px-4 py-3">PRIORIDAD</th>
              <th className="px-4 py-3">TELÉFONO</th>
              <th className="px-4 py-3">CLIENTE</th>
              <th className="px-4 py-3">RESPONSABLE</th>
              <th className="px-4 py-3">CANAL</th>
              <th className="px-4 py-3">ESPERA</th>
              <th className="px-4 py-3">ESTADO</th>
              <th className="px-4 py-3 text-center">ACCIONES</th>
            </tr>
          </thead>

          <tbody>
            {rows.map((r) => (
              <tr
                key={r.id_cliente_chat_center ?? r.id}
                className="border-t border-slate-100 text-sm hover:bg-slate-50 transition"
              >
                <td className="px-4 py-3">
                  <PriorityPill value={r.priority} />
                </td>

                <td className="px-4 py-3 text-slate-600">
                  {r.telefono_limpio || "—"}
                </td>

                <td className="px-4 py-3 font-medium text-slate-800">
                  {r.client || "—"}
                </td>

                <td className="px-4 py-3">
                  <span className="inline-flex items-center rounded-full bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-800 ring-1 ring-sky-200">
                    {r.responsable || "Sin asignar"}
                  </span>
                </td>

                <td className="px-4 py-3">
                  <ChannelBadge value={r.channel} />
                </td>

                <td className="px-4 py-3 font-semibold text-rose-600">
                  {formatDuration(r.waitSeconds)}
                </td>

                <td className="px-4 py-3 text-slate-700">
                  {r.estado_contacto || "—"}
                </td>

                <td className="px-4 py-3 text-center">
                  <button
                    onClick={() => openChatById(r)}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-emerald-600 text-white shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-4 focus:ring-emerald-200 transition"
                    title="Abrir chat"
                    aria-label="Abrir chat"
                  >
                    <i className="bx bxs-chat text-[18px]" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
