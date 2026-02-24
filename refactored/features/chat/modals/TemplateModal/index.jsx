/**
 * ╔════════════════════════════════════════════════════════════╗
 * ║  FEATURE CHAT — TemplateModal (modal de plantillas)       ║
 * ║                                                           ║
 * ║  MIGRACIÓN:                                               ║
 * ║  Extrae ~800 líneas del modal de plantillas de:           ║
 * ║  - src/components/chat/Modales.jsx                        ║
 * ║                                                           ║
 * ║  Ahora: <80 líneas, solo composición.                     ║
 * ║  Lógica → useTemplateModal hook.                          ║
 * ║  Sub-secciones → componentes separados.                   ║
 * ╚════════════════════════════════════════════════════════════╝
 */

import React from "react";
import { useTemplateModal } from "../../hooks/useTemplateModal";
import TemplateSearch from "./TemplateSearch";
import TemplatePlaceholders from "./TemplatePlaceholders";
import TemplateScheduler from "./TemplateScheduler";

/**
 * @param {object}   props
 * @param {boolean}  props.open         - Si el modal está abierto
 * @param {Function} props.onClose      - Cerrar modal
 * @param {object}   props.selectedChat - Chat seleccionado
 */
export default function TemplateModal({ open, onClose, selectedChat }) {
  const modal = useTemplateModal({
    selectedChat,
    onSuccess: () => {
      modal.reset();
      onClose();
    },
  });

  if (!open) return null;

  const recipientPhone =
    selectedChat?.celular_cliente || selectedChat?.telefono || "";

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200">
          <h2 className="text-lg font-bold text-slate-800">
            Enviar plantilla
          </h2>
          <button
            onClick={() => {
              modal.reset();
              onClose();
            }}
            className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition"
          >
            <i className="bx bx-x text-2xl" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-6">
          <TemplateSearch
            value={modal.templateName}
            onChange={modal.setTemplateName}
            language={modal.selectedLanguage}
            onLanguageChange={modal.setSelectedLanguage}
          />

          <TemplatePlaceholders
            values={modal.placeholderValues}
            onChange={modal.setPlaceholderValues}
            headerFile={modal.headerFile}
            onHeaderFileChange={modal.setHeaderFile}
          />

          <TemplateScheduler
            enabled={modal.programarEnvio}
            onToggle={() => modal.setProgramarEnvio(!modal.programarEnvio)}
            fecha={modal.fechaHoraProgramada}
            onFechaChange={modal.setFechaHoraProgramada}
            timezone={modal.timezoneProgramada}
            onTimezoneChange={modal.setTimezoneProgramada}
          />
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-5 border-t border-slate-200">
          <button
            onClick={() => {
              modal.reset();
              onClose();
            }}
            className="px-4 py-2.5 text-sm font-medium rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 transition"
          >
            Cancelar
          </button>
          <button
            onClick={() =>
              modal.programarEnvio
                ? modal.scheduleTemplate(recipientPhone)
                : modal.sendTemplate(recipientPhone)
            }
            disabled={modal.isSending || modal.isScheduling || !modal.templateName}
            className="px-5 py-2.5 text-sm font-medium rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {modal.isSending || modal.isScheduling ? (
              <span className="flex items-center gap-2">
                <i className="bx bx-loader-alt animate-spin" />
                {modal.programarEnvio ? "Programando..." : "Enviando..."}
              </span>
            ) : modal.programarEnvio ? (
              "Programar envío"
            ) : (
              "Enviar plantilla"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
