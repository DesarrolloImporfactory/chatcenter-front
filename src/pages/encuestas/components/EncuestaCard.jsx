import React from "react";
import { TipoBadge } from "./SharedComponents";
import { TIPO_CONFIG } from "../utils/encuestasConstants";

export default function EncuestaCard({ enc, onSelect, onToggle }) {
  const tipoInfo = TIPO_CONFIG[enc.tipo] || TIPO_CONFIG.webhook_lead;

  return (
    <div
      className={`bg-white rounded-xl border ${enc.activa ? "border-gray-200" : "border-dashed border-gray-300 opacity-60"} 
        shadow-sm hover:shadow-md transition-shadow cursor-pointer`}
      onClick={() => onSelect(enc)}
    >
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="min-w-0">
            <h3 className="font-semibold text-gray-800 text-base truncate">
              {enc.nombre}
            </h3>
            <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">
              {enc.descripcion || tipoInfo.descripcionCorta}
            </p>
          </div>
          <TipoBadge tipo={enc.tipo} />
        </div>

        {/* Stats rápidos */}
        <div className="grid grid-cols-3 gap-2 mb-3 mt-3">
          <div className="text-center px-2 py-2 rounded-lg bg-gray-50">
            <p className="text-xl font-bold text-gray-800">
              {enc.total_respuestas || 0}
            </p>
            <p className="text-[9px] text-gray-400 uppercase tracking-wider">
              Respuestas
            </p>
          </div>
          {enc.tipo === "satisfaccion" && (
            <>
              <div className="text-center px-2 py-2 rounded-lg bg-gray-50">
                <p className="text-xl font-bold text-gray-800">
                  {enc.promedio_score || "—"}
                </p>
                <p className="text-[9px] text-gray-400 uppercase tracking-wider">
                  Promedio
                </p>
              </div>
              <div className="text-center px-2 py-2 rounded-lg bg-gray-50">
                <p className="text-xl font-bold text-gray-800">
                  {enc.cooldown_horas}h
                </p>
                <p className="text-[9px] text-gray-400 uppercase tracking-wider">
                  Cooldown
                </p>
              </div>
            </>
          )}
          {enc.tipo === "webhook_lead" && (
            <div className="col-span-2 px-3 py-2 rounded-lg bg-gray-50">
              <p className="text-[10px] text-gray-400 mb-0.5">Webhook Secret</p>
              <code className="text-[10px] text-blue-600 font-mono break-all">
                {enc.webhook_secret || "No configurado"}
              </code>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <div className="flex items-center gap-2 flex-wrap">
            {enc.auto_enviar_al_cerrar === 1 && (
              <span className="text-[9px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-medium">
                Auto-envío al cerrar
              </span>
            )}
            {enc.delay_envio_minutos > 0 && (
              <span className="text-[9px] bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded font-medium">
                Delay {enc.delay_envio_minutos}min
              </span>
            )}
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggle(enc.id);
            }}
            className={`text-[10px] font-medium px-2.5 py-1 rounded-md border transition-colors ${
              enc.activa
                ? "bg-emerald-50 border-emerald-200 text-emerald-600 hover:bg-emerald-100"
                : "bg-gray-50 border-gray-200 text-gray-400 hover:bg-gray-100"
            }`}
          >
            {enc.activa ? "Activa" : "Inactiva"}
          </button>
        </div>
      </div>
    </div>
  );
}
