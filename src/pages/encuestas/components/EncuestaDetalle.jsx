import React, { useEffect, useState, useCallback } from "react";
import chatApi from "../../../api/chatcenter";
import Swal from "sweetalert2";
import { TipoBadge, NpsBar } from "./SharedComponents";
import RespuestasTable from "./RespuestasTable";
import ConfigPanel from "./ConfigPanel";

export default function EncuestaDetalle({ enc, idConfig, onBack }) {
  const [stats, setStats] = useState(null);
  const [respuestas, setRespuestas] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("respuestas");
  const [activa, setActiva] = useState(enc.activa);

  const fetchStats = useCallback(async () => {
    try {
      const res = await chatApi.get(
        `encuestas/${enc.id}/stats?id_configuracion=${idConfig}`,
      );
      setStats(res.data.data);
    } catch (err) {
      console.error(err);
    }
  }, [enc.id, idConfig]);

  const fetchRespuestas = useCallback(
    async (p = 1) => {
      try {
        setLoading(true);
        const res = await chatApi.get(
          `encuestas/${enc.id}/respuestas?id_configuracion=${idConfig}&page=${p}&limit=15`,
        );
        setRespuestas(res.data.data || []);
        setTotal(res.data.total || 0);
        setPage(p);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    },
    [enc.id, idConfig],
  );

  useEffect(() => {
    fetchStats();
    fetchRespuestas(1);
  }, [fetchStats, fetchRespuestas]);

  const totalPages = Math.ceil(total / 15);

  const handleToggle = async () => {
    try {
      const res = await chatApi.patch(`encuestas/${enc.id}/toggle`);
      const newState = res.data.activa;
      setActiva(newState);
      enc.activa = newState;
    } catch (err) {
      Swal.fire({ icon: "error", title: "Error", text: err.message });
    }
  };

  const handleDelete = async () => {
    const r = await Swal.fire({
      icon: "warning",
      title: "¿Eliminar esta encuesta?",
      text: "Se desactivará y dejará de recibir respuestas. Los datos históricos se conservan.",
      showCancelButton: true,
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#ef4444",
    });
    if (!r.isConfirmed) return;
    try {
      await chatApi.delete(`encuestas/${enc.id}`);
      Swal.fire({
        icon: "success",
        title: "Encuesta eliminada",
        timer: 1500,
        showConfirmButton: false,
      });
      onBack();
    } catch (err) {
      Swal.fire({ icon: "error", title: "Error", text: err.message });
    }
  };

  const cardCls = "bg-white rounded-2xl border border-gray-200/80 shadow-sm";

  return (
    <div>
      {/* Header — NO TOCAR */}
      <div className="flex items-center gap-3 mb-5">
        <button
          onClick={onBack}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <i className="bx bx-arrow-back text-xl text-gray-500" />
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="font-bold text-gray-800 text-xl">{enc.nombre}</h2>
            <TipoBadge tipo={enc.tipo} />
          </div>
          {enc.descripcion && (
            <p className="text-xs text-gray-400 mt-0.5">{enc.descripcion}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleToggle}
            className={`text-xs font-medium px-3 py-2 rounded-lg border transition-colors ${
              activa
                ? "bg-emerald-50 border-emerald-200 text-emerald-600 hover:bg-emerald-100"
                : "bg-gray-50 border-gray-200 text-gray-400 hover:bg-gray-100"
            }`}
          >
            <i
              className={`bx ${activa ? "bx-check-circle" : "bx-pause-circle"} mr-1`}
            />
            {activa ? "Activa" : "Inactiva"}
          </button>
          <button
            onClick={handleDelete}
            className="px-3 py-2 rounded-lg border border-red-200 text-red-500 text-xs font-medium hover:bg-red-50 transition-colors"
          >
            <i className="bx bx-trash mr-1" />
            Eliminar
          </button>
        </div>
      </div>

      {/* Stats cards */}
      {stats?.general && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          <div className={`${cardCls} p-4`}>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center">
                <i className="bx bx-bar-chart text-gray-500 text-sm" />
              </div>
              <span className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">
                Total
              </span>
            </div>
            <p className="text-2xl font-black text-gray-800">
              {stats.general.total || 0}
            </p>
          </div>

          {enc.tipo === "satisfaccion" && (
            <>
              <div className={`${cardCls} p-4`}>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center">
                    <i className="bx bx-check-circle text-emerald-500 text-sm" />
                  </div>
                  <span className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">
                    Respondidas
                  </span>
                </div>
                <p className="text-2xl font-black text-emerald-600">
                  {stats.general.respondidas || 0}
                </p>
              </div>
              <div className={`${cardCls} p-4`}>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
                    <i className="bx bx-star text-blue-500 text-sm" />
                  </div>
                  <span className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">
                    Promedio
                  </span>
                </div>
                <p className="text-2xl font-black text-gray-800">
                  {stats.general.promedio_score || "—"}
                </p>
              </div>
              <div className={`${cardCls} p-4`}>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center">
                    <i className="bx bx-error text-red-500 text-sm" />
                  </div>
                  <span className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">
                    Escalados
                  </span>
                </div>
                <p className="text-2xl font-black text-red-500">
                  {stats.general.escalados || 0}
                </p>
              </div>
            </>
          )}

          {enc.tipo === "webhook_lead" && (
            <>
              <div className={`${cardCls} p-4`}>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
                    <i className="bx bx-link-external text-blue-500 text-sm" />
                  </div>
                  <span className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">
                    Webhook
                  </span>
                </div>
                <p className="text-2xl font-black text-blue-600">
                  {stats.general.por_webhook || 0}
                </p>
              </div>
              <div className={`${cardCls} p-4 col-span-2`}>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-lg bg-violet-50 flex items-center justify-center">
                    <i className="bx bx-key text-violet-500 text-sm" />
                  </div>
                  <span className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">
                    Secret
                  </span>
                </div>
                <code className="text-xs text-blue-600 font-mono block break-all select-all">
                  {enc.webhook_secret || "No configurado"}
                </code>
              </div>
            </>
          )}
        </div>
      )}

      {/* NPS + Ranking */}
      {enc.tipo === "satisfaccion" && stats?.general && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-5">
          <div className={`${cardCls} p-5`}>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center">
                <i className="bx bx-trending-up text-emerald-500 text-sm" />
              </div>
              <h4 className="text-xs font-bold text-gray-700 uppercase tracking-widest">
                NPS Score
              </h4>
            </div>
            <NpsBar
              promotores={stats.general.promotores || 0}
              neutrales={stats.general.neutrales || 0}
              detractores={stats.general.detractores || 0}
            />
          </div>
          <div className={`${cardCls} p-5`}>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-lg bg-violet-50 flex items-center justify-center">
                <i className="bx bx-group text-violet-500 text-sm" />
              </div>
              <h4 className="text-xs font-bold text-gray-700 uppercase tracking-widest">
                Por Encargado
              </h4>
            </div>
            {stats.porEncargado?.length === 0 ? (
              <p className="text-xs text-gray-400">Sin datos aún</p>
            ) : (
              <div className="space-y-2 max-h-36 overflow-y-auto">
                {stats.porEncargado?.map((e, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between text-xs p-2 rounded-lg bg-gray-50/80"
                  >
                    <span className="text-gray-700 font-medium truncate mr-2">
                      {e.nombre_encargado}
                    </span>
                    <div className="flex items-center gap-2.5 shrink-0">
                      <span className="text-gray-400 text-[10px]">
                        {e.total} resp.
                      </span>
                      <span
                        className={`font-bold text-sm ${(e.promedio || 0) >= 4 ? "text-emerald-600" : (e.promedio || 0) >= 3 ? "text-yellow-500" : "text-red-500"}`}
                      >
                        {e.promedio || "—"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-gray-100 rounded-xl p-1 w-fit">
        {["respuestas", "config"].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-lg text-xs font-semibold transition-all ${
              tab === t
                ? "bg-white text-gray-800 shadow-sm"
                : "text-gray-400 hover:text-gray-600"
            }`}
          >
            {t === "respuestas" ? "Respuestas" : "Configuración"}
          </button>
        ))}
      </div>

      {tab === "respuestas" && (
        <RespuestasTable
          enc={enc}
          respuestas={respuestas}
          loading={loading}
          page={page}
          total={total}
          totalPages={totalPages}
          onPageChange={fetchRespuestas}
        />
      )}

      {tab === "config" && (
        <ConfigPanel enc={enc} idConfig={idConfig} onUpdated={fetchStats} />
      )}
    </div>
  );
}
