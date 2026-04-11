import React, { useState } from "react";
import Swal from "sweetalert2";
import chatApi from "../../../api/chatcenter";

/**
 * AdsboardCampaignsTable
 *
 * Tabla de campañas con métricas de rendimiento y control de estado.
 *
 * Columnas:
 * - Campaña: nombre de la campaña en Meta Ads
 * - Estado: ACTIVE, PAUSED, etc. — con botón para pausar/activar (requiere ads_management)
 * - Gasto: total invertido en esa campaña
 * - Revenue: ventas atribuidas a esa campaña
 * - ROAS: retorno por dólar invertido en esa campaña
 * - Compras: ventas completadas de esa campaña
 * - CPA: costo por venta de esa campaña
 * - CTR: tasa de clics de esa campaña
 * - Msgs WA: conversaciones de WhatsApp iniciadas
 * - Budget/día: presupuesto diario configurado
 */

const fmt = (n, decimals = 0) => {
  if (n == null || isNaN(n)) return "—";
  return Number(n).toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};

const fmtCurrency = (n, currency = "USD") => {
  if (n == null || isNaN(n)) return "—";
  return Number(n).toLocaleString("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  });
};

const statusColor = (s) => {
  if (!s) return "bg-slate-100 text-slate-600";
  const st = String(s).toUpperCase();
  if (st === "ACTIVE")
    return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200";
  if (st === "PAUSED")
    return "bg-amber-50 text-amber-700 ring-1 ring-amber-200";
  if (st === "DELETED" || st === "ARCHIVED")
    return "bg-slate-50 text-slate-400 ring-1 ring-slate-200";
  return "bg-slate-50 text-slate-600 ring-1 ring-slate-200";
};

const statusLabel = (s) => {
  if (!s) return "—";
  const map = {
    ACTIVE: "Activa",
    PAUSED: "Pausada",
    DELETED: "Eliminada",
    ARCHIVED: "Archivada",
    IN_PROCESS: "Procesando",
    WITH_ISSUES: "Con errores",
  };
  return map[String(s).toUpperCase()] || s;
};

export default function AdsboardCampaignsTable({
  campaigns,
  currency = "USD",
  id_configuracion,
  onRefresh,
}) {
  const [togglingId, setTogglingId] = useState(null);

  const handleToggle = async (campaign) => {
    const currentStatus = String(campaign.effective_status || "").toUpperCase();
    const newStatus = currentStatus === "ACTIVE" ? "PAUSED" : "ACTIVE";
    const actionText =
      newStatus === "PAUSED" ? "Pausar campaña" : "Activar campaña";

    const ask = await Swal.fire({
      title: actionText,
      html: `<p class="text-sm text-slate-600">¿${newStatus === "PAUSED" ? "Pausar" : "Activar"} la campaña <b>${campaign.campaign_name}</b>?</p>
             <p class="text-xs text-slate-400 mt-2">Este cambio se aplica directamente en tu cuenta de Meta Ads.</p>`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: newStatus === "PAUSED" ? "Sí, pausar" : "Sí, activar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: newStatus === "PAUSED" ? "#f59e0b" : "#059669",
    });

    if (!ask.isConfirmed) return;

    try {
      setTogglingId(campaign.campaign_id);
      const { data } = await chatApi.post("/meta_ads/campaigns/toggle", {
        id_configuracion,
        campaign_id: campaign.campaign_id,
        status: newStatus,
      });

      if (data.success) {
        Swal.fire({
          toast: true,
          position: "top-end",
          icon: "success",
          title: `Campaña ${newStatus === "PAUSED" ? "pausada" : "activada"}`,
          showConfirmButton: false,
          timer: 2000,
        });
        onRefresh?.();
      } else {
        Swal.fire(
          "Error",
          data.message || "No se pudo cambiar el estado.",
          "error",
        );
      }
    } catch (err) {
      Swal.fire(
        "Error",
        err?.response?.data?.message ||
          "No se pudo cambiar el estado. Verifica que tengas el permiso ads_management.",
        "error",
      );
    } finally {
      setTogglingId(null);
    }
  };

  if (!campaigns.length) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white px-8 py-12 text-center">
        <i className="bx bx-layer text-3xl text-slate-300 mb-2" />
        <p className="text-sm text-slate-500">
          No hay datos de campañas para este período.
        </p>
        <p className="text-xs text-slate-400 mt-1">
          Prueba con un rango de fechas diferente.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
      {/* Header explicativo */}
      <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50">
        <div className="flex items-center gap-2">
          <i className="bx bx-layer text-indigo-600" />
          <span className="text-xs font-semibold text-slate-700">
            Campañas ({campaigns.length})
          </span>
          <span className="text-[10px] text-slate-400 ml-auto">
            Puedes pausar o activar campañas directamente desde aquí
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-100">
              <th className="px-4 pb-3 pt-4">Campaña</th>
              <th className="pb-3 pt-4">Estado</th>
              <th className="pb-3 pt-4 text-right">Gasto</th>
              <th className="pb-3 pt-4 text-right">Revenue</th>
              <th className="pb-3 pt-4 text-right">ROAS</th>
              <th className="pb-3 pt-4 text-right">Compras</th>
              <th className="pb-3 pt-4 text-right">CPA</th>
              <th className="pb-3 pt-4 text-right">CTR</th>
              <th className="pb-3 pt-4 text-right">Msgs WA</th>
              <th className="pb-3 pt-4 pr-4 text-right">Budget/día</th>
            </tr>
          </thead>
          <tbody>
            {campaigns.map((c, i) => {
              const canToggle =
                c.effective_status === "ACTIVE" ||
                c.effective_status === "PAUSED";
              const isToggling = togglingId === c.campaign_id;

              return (
                <tr
                  key={c.campaign_id || i}
                  className="border-b border-slate-50 hover:bg-slate-50/50"
                >
                  <td className="px-4 py-3 font-medium text-slate-800 max-w-[200px] truncate">
                    {c.campaign_name}
                  </td>
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${statusColor(c.effective_status)}`}
                      >
                        {statusLabel(c.effective_status)}
                      </span>
                      {canToggle && (
                        <button
                          type="button"
                          onClick={() => handleToggle(c)}
                          disabled={isToggling}
                          className={`w-6 h-6 rounded-md grid place-items-center transition ${
                            c.effective_status === "ACTIVE"
                              ? "text-amber-600 hover:bg-amber-50"
                              : "text-emerald-600 hover:bg-emerald-50"
                          } ${isToggling ? "opacity-50 cursor-not-allowed" : ""}`}
                          title={
                            c.effective_status === "ACTIVE"
                              ? "Pausar campaña"
                              : "Activar campaña"
                          }
                        >
                          <i
                            className={`bx ${isToggling ? "bx-loader-alt animate-spin" : c.effective_status === "ACTIVE" ? "bx-pause" : "bx-play"} text-sm`}
                          />
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="py-3 text-right tabular-nums">
                    {fmtCurrency(c.spend, currency)}
                  </td>
                  <td className="py-3 text-right tabular-nums text-emerald-700 font-medium">
                    {fmtCurrency(c.purchase_value, currency)}
                  </td>
                  <td className="py-3 text-right tabular-nums font-medium">
                    <span
                      className={
                        c.roas >= 2
                          ? "text-emerald-700"
                          : c.roas > 0
                            ? "text-amber-700"
                            : "text-slate-400"
                      }
                    >
                      {fmt(c.roas, 2)}x
                    </span>
                  </td>
                  <td className="py-3 text-right tabular-nums">
                    {fmt(c.purchases)}
                  </td>
                  <td className="py-3 text-right tabular-nums">
                    {fmtCurrency(c.cpa_purchase, currency)}
                  </td>
                  <td className="py-3 text-right tabular-nums">
                    {fmt(c.ctr, 2)}%
                  </td>
                  <td className="py-3 text-right tabular-nums">
                    {fmt(c.messaging_conversations)}
                  </td>
                  <td className="py-3 pr-4 text-right tabular-nums text-slate-500">
                    {c.daily_budget
                      ? fmtCurrency(c.daily_budget, currency)
                      : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
