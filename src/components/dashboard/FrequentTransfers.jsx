import React from "react";
import { classNames } from "../../utils/parseEventDef";

const CHAT_ROUTE = "/chat";

function TransferBadge({ count }) {
  let style = "bg-slate-50 text-slate-600 border-slate-200";
  if (count >= 7) style = "bg-rose-50 text-rose-700 border-rose-200";
  else if (count >= 5) style = "bg-amber-50 text-amber-700 border-amber-200";
  else if (count >= 3) style = "bg-orange-50 text-orange-700 border-orange-200";

  return (
    <span
      className={classNames(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-bold tabular-nums",
        style,
      )}
    >
      <i className="bx bx-transfer-alt text-xs"></i>
      {count}
    </span>
  );
}

function ChannelBadge({ value }) {
  const v = (value ?? "").toString().toLowerCase();
  const map = {
    whatsapp: "text-emerald-700",
    instagram: "text-amber-700",
    messenger: "text-sky-700",
  };

  return (
    <span
      className={classNames("text-sm font-medium", map[v] || "text-slate-700")}
    >
      {value || "—"}
    </span>
  );
}

export default function FrequentTransfers({ data = [] }) {
  const openChat = (row) => {
    const chatId = row.id;
    if (!chatId) return;

    // Setear en localStorage para que el chat lo encuentre
    if (row.id_configuracion) {
      localStorage.setItem("id_configuracion", row.id_configuracion);
    }

    const url = `${window.location.origin}${CHAT_ROUTE}/${chatId}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 shadow-sm">
            <i className="bx bx-transfer text-base text-white"></i>
          </div>
          <div>
            <h3 className="text-sm font-semibold tracking-wide text-slate-700">
              CHATS CON MÚLTIPLES TRANSFERENCIAS
            </h3>
            <p className="text-xs text-slate-400">
              Clientes transferidos 3+ veces en el período
            </p>
          </div>
        </div>

        <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-1.5">
          <span className="text-xs font-bold text-amber-700">
            {data.length} cliente{data.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="max-h-[420px] overflow-auto rounded-xl border border-slate-200">
        <table className="w-full min-w-[780px] border-collapse">
          <thead className="sticky top-0 z-10 bg-slate-50">
            <tr className="text-left text-xs text-slate-500">
              <th className="px-4 py-3">TRANSFERENCIAS</th>
              <th className="px-4 py-3">TELÉFONO</th>
              <th className="px-4 py-3">CLIENTE</th>
              <th className="px-4 py-3">RESPONSABLE ACTUAL</th>
              <th className="px-4 py-3">CANAL</th>
              <th className="px-4 py-3 text-center">ACCIONES</th>
            </tr>
          </thead>

          <tbody>
            {data.map((r, idx) => (
              <tr
                key={r.id || idx}
                className="border-t border-slate-100 text-sm transition hover:bg-amber-50/30"
              >
                <td className="px-4 py-3">
                  <TransferBadge count={r.totalTransferencias} />
                </td>

                <td className="px-4 py-3 text-slate-600 tabular-nums">
                  {r.telefono || "—"}
                </td>

                <td className="px-4 py-3 font-medium text-slate-800">
                  {r.client || "—"}
                </td>

                <td className="px-4 py-3">
                  <span
                    className={classNames(
                      "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1",
                      r.responsableActual === "Sin asignar"
                        ? "bg-slate-50 text-slate-500 ring-slate-200"
                        : "bg-sky-50 text-sky-800 ring-sky-200",
                    )}
                  >
                    {r.responsableActual || "Sin asignar"}
                  </span>
                </td>

                <td className="px-4 py-3">
                  <ChannelBadge value={r.channel} />
                </td>

                <td className="px-4 py-3 text-center">
                  <button
                    onClick={() => openChat(r)}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-amber-500 text-white shadow-sm hover:bg-amber-600 focus:outline-none focus:ring-4 focus:ring-amber-200 transition"
                    title="Abrir chat"
                    aria-label="Abrir chat"
                  >
                    <i className="bx bxs-chat text-[18px]" />
                  </button>
                </td>
              </tr>
            ))}

            {data.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center">
                  <div className="flex flex-col items-center text-slate-400">
                    <i className="bx bx-check-circle text-4xl mb-2 text-emerald-400"></i>
                    <span className="text-sm font-medium">
                      Sin clientes con transferencias excesivas
                    </span>
                    <span className="text-xs text-slate-300 mt-0.5">
                      Ningún cliente fue transferido 3 o más veces
                    </span>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
