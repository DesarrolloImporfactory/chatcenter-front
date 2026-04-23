import React, { useEffect, useState, useMemo } from "react";
import chatApi from "../../../api/chatcenter";

const PLACEHOLDERS = [
  { key: "{nombre}", label: "Nombre" },
  { key: "{apellido}", label: "Apellido" },
  { key: "{email}", label: "Email" },
  { key: "{telefono}", label: "Teléfono" },
];

const DATOS_PREVIEW = {
  nombre: "Alisson",
  apellido: "Pérez",
  email: "alisson@test.com",
  telefono: "593999888777",
};

function resolverPreview(str) {
  if (!str) return "";
  return String(str)
    .replace(/\{nombre\}/gi, DATOS_PREVIEW.nombre)
    .replace(/\{apellido\}/gi, DATOS_PREVIEW.apellido)
    .replace(/\{email\}/gi, DATOS_PREVIEW.email)
    .replace(/\{telefono\}/gi, DATOS_PREVIEW.telefono)
    .replace(/\s+([!,.?])/g, "$1")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function contarVariables(text) {
  if (!text) return 0;
  const matches = String(text).match(/\{\{(\d+)\}\}/g) || [];
  if (matches.length === 0) return 0;
  const numeros = matches.map((m) => parseInt(m.replace(/\D/g, ""), 10));
  return Math.max(...numeros);
}

function parseTemplate(tpl) {
  const body = tpl.components?.find((c) => c.type === "BODY");
  const header = tpl.components?.find((c) => c.type === "HEADER");
  const bodyText = body?.text || "";
  return {
    name: tpl.name,
    language: tpl.language,
    status: tpl.status,
    category: tpl.category,
    body_text: bodyText,
    variables_count: contarVariables(bodyText),
    header_format: header?.format || null,
  };
}

/**
 * Configuración de envío automático para encuestas webhook_lead.
 *
 * Props:
 *   idConfig    — id_configuracion (requerido)
 *   value       — { mensaje_dentro_24h, template_fuera_24h, template_parameters }
 *   onChange    — (next) => void
 */
export default function ConfigMensajeEnvio({ idConfig, value, onChange }) {
  const [templates, setTemplates] = useState([]);
  const [loadingTpl, setLoadingTpl] = useState(false);
  const [errorTpl, setErrorTpl] = useState(null);
  const [stateMeta, setStateMeta] = useState(null);
  const [focusedParamIdx, setFocusedParamIdx] = useState(null);
  const [focusedTextarea, setFocusedTextarea] = useState(false);

  const mensaje = value?.mensaje_dentro_24h || "";
  const templateName = value?.template_fuera_24h || "";
  const params = Array.isArray(value?.template_parameters)
    ? value.template_parameters
    : [];

  // ── Cargar templates desde endpoint existente ──
  useEffect(() => {
    if (!idConfig) return;

    let cancelled = false;
    const fetchTemplates = async () => {
      setLoadingTpl(true);
      setErrorTpl(null);

      try {
        let allTemplates = [];
        let after = null;
        let state = "OK";

        for (let page = 0; page < 5; page++) {
          const res = await chatApi.post(
            "whatsapp_managment/obtenerTemplatesWhatsapp",
            {
              id_configuracion: idConfig,
              limit: 100,
              ...(after ? { after } : {}),
            },
          );

          if (cancelled) return;

          state = res.data?.meta?.state || "OK";
          if (state !== "OK") break;

          const pageData = Array.isArray(res.data?.data) ? res.data.data : [];
          allTemplates = allTemplates.concat(pageData);

          after = res.data?.paging?.cursors?.after || null;
          if (!after) break;
        }

        if (cancelled) return;

        setStateMeta(state);

        if (state !== "OK") {
          setTemplates([]);
          return;
        }

        const approved = allTemplates
          .filter((t) => t.status === "APPROVED")
          .map(parseTemplate)
          .sort((a, b) => a.name.localeCompare(b.name));

        setTemplates(approved);
      } catch (err) {
        if (cancelled) return;
        setErrorTpl(
          err.response?.data?.message ||
            err.message ||
            "Error cargando templates",
        );
        setTemplates([]);
      } finally {
        if (!cancelled) setLoadingTpl(false);
      }
    };

    fetchTemplates();
    return () => {
      cancelled = true;
    };
  }, [idConfig]);

  const selectedTpl = useMemo(
    () => templates.find((t) => t.name === templateName) || null,
    [templates, templateName],
  );

  // ── Auto-ajustar cantidad de params cuando cambia template ──
  useEffect(() => {
    if (!selectedTpl) {
      if (params.length > 0) {
        onChange({ ...value, template_parameters: [] });
      }
      return;
    }
    const needed = selectedTpl.variables_count;
    if (params.length !== needed) {
      const next = Array.from({ length: needed }, (_, i) => params[i] || "");
      onChange({ ...value, template_parameters: next });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateName, selectedTpl?.variables_count]);

  const update = (patch) => onChange({ ...value, ...patch });

  const updateParam = (idx, val) => {
    const next = [...params];
    next[idx] = val;
    update({ template_parameters: next });
  };

  const insertPlaceholder = (placeholder) => {
    if (focusedParamIdx !== null) {
      updateParam(
        focusedParamIdx,
        (params[focusedParamIdx] || "") + placeholder,
      );
    } else if (focusedTextarea) {
      update({ mensaje_dentro_24h: mensaje + placeholder });
    }
  };

  const previewMensaje = resolverPreview(mensaje);
  const previewTemplate = useMemo(() => {
    if (!selectedTpl) return "";
    let text = selectedTpl.body_text;
    params.forEach((p, i) => {
      text = text.replace(`{{${i + 1}}}`, resolverPreview(p) || `[vacío]`);
    });
    return text;
  }, [selectedTpl, params]);

  const inputCls =
    "w-full bg-gray-50/80 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 focus:bg-white outline-none transition-all";
  const labelCls =
    "block text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-1.5";

  return (
    <div className="space-y-5">
      {/* Intro */}
      <div className="flex items-start gap-2.5 p-3 rounded-xl bg-violet-50/60 border border-violet-200/50">
        <i className="bx bx-paper-plane text-violet-500 text-lg mt-0.5 shrink-0" />
        <div>
          <p className="text-xs font-bold text-violet-800 mb-0.5">
            Respuesta automática al lead
            <span className="text-[10px] font-normal text-violet-500 ml-1.5">
              (opcional)
            </span>
          </p>
          <p className="text-[11px] text-violet-700/90 leading-relaxed">
            Si el contacto te escribió en las últimas 24h, recibe el{" "}
            <strong>mensaje de texto</strong>. Si no, recibe el{" "}
            <strong>template</strong> (requerido por Meta fuera de 24h).
          </p>
        </div>
      </div>

      {/* Chips de placeholders */}
      <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-3">
        <p className="text-[10px] font-bold text-blue-700 uppercase tracking-widest mb-2">
          Datos del lead que puedes insertar
        </p>
        <div className="flex flex-wrap gap-1.5">
          {PLACEHOLDERS.map((p) => (
            <button
              key={p.key}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => insertPlaceholder(p.key)}
              disabled={focusedParamIdx === null && !focusedTextarea}
              className="px-2.5 py-1 rounded-md bg-white border border-blue-200 text-xs font-mono text-blue-700 hover:bg-blue-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              title={`Insertar ${p.label}`}
            >
              + {p.key}
            </button>
          ))}
        </div>
        {focusedParamIdx === null && !focusedTextarea && (
          <p className="text-[10px] text-gray-400 mt-2 italic">
            Haz clic en un campo de texto para habilitar los botones
          </p>
        )}
      </div>

      {/* Mensaje dentro 24h */}
      <div>
        <label className={labelCls}>
          <i className="bx bx-message-rounded text-emerald-500 mr-1" />
          Mensaje de texto (dentro de 24h)
        </label>
        <textarea
          rows={3}
          value={mensaje}
          onChange={(e) => update({ mensaje_dentro_24h: e.target.value })}
          onFocus={() => {
            setFocusedTextarea(true);
            setFocusedParamIdx(null);
          }}
          onBlur={() => setTimeout(() => setFocusedTextarea(false), 200)}
          placeholder="Hola {nombre}! Gracias por dejarnos tus datos 👋"
          className={`${inputCls} resize-none font-mono text-xs leading-relaxed`}
        />
        {mensaje && (
          <div className="mt-1.5 text-[10px] text-gray-500">
            Preview:{" "}
            <span className="italic text-gray-700">"{previewMensaje}"</span>
          </div>
        )}
      </div>

      {/* Dropdown de template */}
      <div>
        <label className={labelCls}>
          <i className="bx bx-file text-violet-500 mr-1" />
          Template (fuera de 24h)
        </label>

        {loadingTpl ? (
          <div className="text-xs text-gray-400 py-2">
            <i className="bx bx-loader-alt bx-spin mr-1" />
            Cargando templates...
          </div>
        ) : stateMeta === "NO_CREDENTIALS" ? (
          <div className="text-xs text-amber-600 py-2 bg-amber-50 border border-amber-200 rounded-lg px-3">
            <i className="bx bx-error-circle mr-1" />
            Esta configuración aún no tiene WhatsApp Business conectado
          </div>
        ) : stateMeta === "INVALID_TOKEN" ? (
          <div className="text-xs text-red-600 py-2 bg-red-50 border border-red-200 rounded-lg px-3">
            <i className="bx bx-error-circle mr-1" />
            Token de Meta inválido — reconecta la cuenta de WhatsApp
          </div>
        ) : stateMeta === "RATE_LIMITED" ? (
          <div className="text-xs text-orange-600 py-2 bg-orange-50 border border-orange-200 rounded-lg px-3">
            <i className="bx bx-time mr-1" />
            Meta está limitando las consultas. Intenta en unos minutos.
          </div>
        ) : errorTpl ? (
          <div className="text-xs text-red-500 py-2">
            <i className="bx bx-error-circle mr-1" />
            {errorTpl}
          </div>
        ) : (
          <>
            <select
              value={templateName}
              onChange={(e) => update({ template_fuera_24h: e.target.value })}
              className={`${inputCls} bg-white`}
            >
              <option value="">— Ninguno —</option>
              {templates.map((t) => (
                <option key={`${t.name}_${t.language}`} value={t.name}>
                  {t.name} ({t.language})
                  {t.variables_count > 0 ? ` · ${t.variables_count} var` : ""}
                </option>
              ))}
            </select>
            {templates.length === 0 && (
              <p className="text-[10px] text-gray-400 mt-1">
                No hay templates aprobados en Meta para esta cuenta
              </p>
            )}
          </>
        )}

        {/* Preview body del template */}
        {selectedTpl && (
          <div className="mt-2 bg-gray-50 border border-gray-200 rounded-xl p-3">
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">
              Contenido del template
            </p>
            <p className="text-xs text-gray-700 whitespace-pre-wrap font-mono">
              {selectedTpl.body_text}
            </p>
          </div>
        )}
      </div>

      {/* Params dinámicos del template */}
      {selectedTpl && selectedTpl.variables_count > 0 && (
        <div>
          <label className={labelCls}>
            <i className="bx bx-list-ol text-orange-500 mr-1" />
            Variables del template ({selectedTpl.variables_count})
          </label>
          <div className="space-y-2">
            {params.map((p, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-orange-600 w-10 shrink-0">
                  {`{{${idx + 1}}}`}
                </span>
                <input
                  type="text"
                  value={p}
                  onChange={(e) => updateParam(idx, e.target.value)}
                  onFocus={() => {
                    setFocusedParamIdx(idx);
                    setFocusedTextarea(false);
                  }}
                  onBlur={() => setTimeout(() => setFocusedParamIdx(null), 200)}
                  placeholder={`Valor para variable ${idx + 1}`}
                  className={`${inputCls} flex-1 py-1.5`}
                />
              </div>
            ))}
          </div>

          {previewTemplate && (
            <div className="mt-2 bg-violet-50 border border-violet-100 rounded-xl p-3">
              <p className="text-[10px] font-bold text-violet-700 uppercase tracking-widest mb-1">
                Preview con datos de ejemplo
              </p>
              <p className="text-xs text-gray-800 whitespace-pre-wrap">
                {previewTemplate}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Mensaje cuando no hay nada configurado */}
      {!mensaje && !templateName && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
          <p className="text-xs text-gray-500">
            <i className="bx bx-info-circle mr-1" />
            Sin configurar ningún mensaje, la encuesta solo{" "}
            <strong>recibirá las respuestas</strong> del webhook sin enviar nada
            al lead.
          </p>
        </div>
      )}
    </div>
  );
}
