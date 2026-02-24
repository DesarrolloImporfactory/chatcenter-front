/**
 * ╔════════════════════════════════════════════════════════════╗
 * ║  FEATURE CHAT — Hook useTemplateModal                     ║
 * ║                                                           ║
 * ║  MIGRACIÓN:                                               ║
 * ║  Extrae ~800 líneas de lógica de plantillas que estaban   ║
 * ║  inline en src/components/chat/Modales.jsx                ║
 * ║                                                           ║
 * ║  Toda la lógica de: búsqueda de templates, placeholders,  ║
 * ║  programación, envío inmediato, archivos header.          ║
 * ╚════════════════════════════════════════════════════════════╝
 */

import { useState, useCallback } from "react";
import chatMessageService from "../services/chatMessageService";
import { formatDatetimeToSQL } from "../../../shared/lib/formatters";
import { Toast } from "../../../shared/ui/Toast";

/**
 * @param {object}   opts
 * @param {object}   opts.selectedChat - Chat seleccionado
 * @param {Function} opts.onSuccess    - Callback al completar envío
 */
export function useTemplateModal({ selectedChat, onSuccess } = {}) {
  /* ─────── Estado del modal ─────── */
  const [templateName, setTemplateName] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState("es");
  const [placeholderValues, setPlaceholderValues] = useState({});
  const [headerFile, setHeaderFile] = useState(null);

  /* ─────── Programación ─────── */
  const [programarEnvio, setProgramarEnvio] = useState(false);
  const [fechaHoraProgramada, setFechaHoraProgramada] = useState("");
  const [timezoneProgramada, setTimezoneProgramada] = useState(
    Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Guayaquil"
  );
  const [isScheduling, setIsScheduling] = useState(false);
  const [isSending, setIsSending] = useState(false);

  /* ─────── Construir payload ─────── */
  const buildPayload = useCallback(
    (recipientPhone) => {
      const components = [];

      // Header (si hay archivo)
      if (headerFile) {
        components.push({
          type: "header",
          parameters: [
            {
              type: "document",
              document: { link: headerFile },
            },
          ],
        });
      }

      // Body placeholders
      const bodyParams = Object.entries(placeholderValues)
        .filter(([k]) => k.startsWith("body_"))
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([, val]) => ({ type: "text", text: String(val).trim() }));

      if (bodyParams.length) {
        components.push({ type: "body", parameters: bodyParams });
      }

      return {
        messaging_product: "whatsapp",
        to: recipientPhone,
        type: "template",
        template: {
          name: templateName,
          language: { code: selectedLanguage },
          components,
        },
      };
    },
    [templateName, selectedLanguage, placeholderValues, headerFile]
  );

  /* ─────── Envío inmediato ─────── */
  const sendTemplate = useCallback(
    async (recipientPhone) => {
      if (isSending) return;
      setIsSending(true);
      try {
        const payload = buildPayload(recipientPhone);
        await chatMessageService.sendTemplate(payload);
        Toast.fire({ icon: "success", title: "Plantilla enviada" });
        onSuccess?.();
      } catch (err) {
        Toast.fire({ icon: "error", title: "Error al enviar plantilla" });
        console.error("Error sendTemplate:", err);
      } finally {
        setIsSending(false);
      }
    },
    [buildPayload, isSending, onSuccess]
  );

  /* ─────── Envío programado ─────── */
  const scheduleTemplate = useCallback(
    async (recipientPhone) => {
      if (isScheduling) return;
      setIsScheduling(true);
      try {
        const fecha = formatDatetimeToSQL(fechaHoraProgramada);
        if (!fecha) {
          Toast.fire({ icon: "warning", title: "Selecciona una fecha válida" });
          return;
        }
        const fd = new FormData();
        fd.append("fecha_programada", fecha);
        fd.append("timezone", timezoneProgramada);
        fd.append("payload", JSON.stringify(buildPayload(recipientPhone)));
        if (headerFile) fd.append("header_file", headerFile);

        await chatMessageService.scheduleTemplate(fd);
        Toast.fire({ icon: "success", title: "Plantilla programada" });
        onSuccess?.();
      } catch (err) {
        Toast.fire({ icon: "error", title: "Error al programar" });
        console.error("Error scheduleTemplate:", err);
      } finally {
        setIsScheduling(false);
      }
    },
    [isScheduling, fechaHoraProgramada, timezoneProgramada, buildPayload, headerFile, onSuccess]
  );

  /* ─────── Reset ─────── */
  const reset = useCallback(() => {
    setTemplateName("");
    setSelectedLanguage("es");
    setPlaceholderValues({});
    setHeaderFile(null);
    setProgramarEnvio(false);
    setFechaHoraProgramada("");
    setIsSending(false);
    setIsScheduling(false);
  }, []);

  return {
    // Estado
    templateName,
    setTemplateName,
    selectedLanguage,
    setSelectedLanguage,
    placeholderValues,
    setPlaceholderValues,
    headerFile,
    setHeaderFile,
    programarEnvio,
    setProgramarEnvio,
    fechaHoraProgramada,
    setFechaHoraProgramada,
    timezoneProgramada,
    setTimezoneProgramada,
    isSending,
    isScheduling,
    // Acciones
    sendTemplate,
    scheduleTemplate,
    reset,
  };
}

export default useTemplateModal;
