import React, { useState, useMemo } from "react";
import chatApi from "../../../api/chatcenter";
import Swal from "sweetalert2";
import ConfigMensajeEnvio from "./ConfigMensajeEnvio";

const DEFAULT_MENSAJE =
  "¡Hola {nombre}! 🙏\n\nGracias por comunicarte con nosotros. Nos encantaría saber cómo fue tu experiencia:\n\n👉 {link}\n\n¡Solo toma 10 segundos!";

export default function ConfigPanel({ enc, idConfig, onUpdated }) {
  const [cooldown, setCooldown] = useState(enc.cooldown_horas);
  const [delay, setDelay] = useState(enc.delay_envio_minutos);
  const [autoEnviar, setAutoEnviar] = useState(enc.auto_enviar_al_cerrar === 1);
  const [umbral, setUmbral] = useState(enc.umbral_escalacion);
  const [mensaje, setMensaje] = useState(enc.mensaje_envio || DEFAULT_MENSAJE);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(null);

  // Estado de auto-respuesta webhook
  const [mensajeEnvio, setMensajeEnvio] = useState(() => {
    let params = [];
    if (enc.template_parameters) {
      try {
        params =
          typeof enc.template_parameters === "string"
            ? JSON.parse(enc.template_parameters)
            : Array.isArray(enc.template_parameters)
              ? enc.template_parameters
              : [];
      } catch {
        params = [];
      }
    }
    return {
      mensaje_dentro_24h: enc.mensaje_dentro_24h || "",
      template_fuera_24h: enc.template_fuera_24h || "",
      template_parameters: Array.isArray(params) ? params : [],
    };
  });
  const [savingEnvio, setSavingEnvio] = useState(false);

  const mensajeTieneLink = useMemo(
    () => enc.tipo !== "satisfaccion" || mensaje.includes("{link}"),
    [mensaje, enc.tipo],
  );

  const handleSave = async () => {
    if (!mensajeTieneLink) return;
    setSaving(true);
    try {
      await chatApi.put(`encuestas/${enc.id}`, {
        id_configuracion: idConfig,
        cooldown_horas: cooldown,
        delay_envio_minutos: delay,
        auto_enviar_al_cerrar: autoEnviar,
        umbral_escalacion: umbral,
        mensaje_envio: mensaje || DEFAULT_MENSAJE,
      });
      Swal.fire({
        icon: "success",
        title: "Configuración guardada",
        timer: 1500,
        showConfirmButton: false,
      });
      onUpdated();
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Error al guardar",
        text: err.message,
      });
    } finally {
      setSaving(false);
    }
  };
  const handleSaveEnvio = async () => {
    setSavingEnvio(true);
    try {
      await chatApi.put(`encuestas/${enc.id}`, {
        id_configuracion: idConfig,
        mensaje_dentro_24h: mensajeEnvio.mensaje_dentro_24h || null,
        template_fuera_24h: mensajeEnvio.template_fuera_24h || null,
        template_parameters:
          mensajeEnvio.template_parameters?.length > 0
            ? mensajeEnvio.template_parameters
            : null,
      });
      Swal.fire({
        icon: "success",
        title: "Auto-respuesta guardada",
        timer: 1500,
        showConfirmButton: false,
      });
      onUpdated?.();
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Error al guardar",
        text: err.response?.data?.message || err.message,
      });
    } finally {
      setSavingEnvio(false);
    }
  };

  const copyToClipboard = (text, key) => {
    navigator.clipboard?.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const webhookUrl =
    "https://chat.imporfactory.app/api/v1/webhook_contactos/inbound";

  const ejemploBody = JSON.stringify(
    {
      nombre: "Julio Jaramillo",
      correo: "jjmillo@email.com",
      telefono: "+593962000000",
      "¿Qué producto importar?": "Electrónica",
      "¿Cuánto invertir?": "Más de 5,000",
    },
    null,
    2,
  );

  const CopyButton = ({ textToCopy, copyKey }) => (
    <button
      onClick={() => copyToClipboard(textToCopy, copyKey)}
      className={`px-3 py-2 rounded-lg border text-xs font-medium transition-all shrink-0 ${
        copied === copyKey
          ? "bg-emerald-50 border-emerald-300 text-emerald-600 shadow-sm"
          : "bg-white border-gray-200 text-gray-400 hover:text-gray-600 hover:border-gray-300 hover:shadow-sm"
      }`}
    >
      <i
        className={`bx ${copied === copyKey ? "bx-check" : "bx-copy"} text-sm`}
      />
    </button>
  );

  const inputCls =
    "w-full bg-gray-50/80 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 focus:bg-white outline-none transition-all";
  const labelCls =
    "block text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-1.5";
  const cardCls =
    "bg-white rounded-2xl border border-gray-200/80 shadow-sm hover:shadow-md transition-shadow";

  return (
    <div className="space-y-5">
      {/* ═══ Webhook Lead ═══ */}
      {enc.tipo === "webhook_lead" && (
        <div className={`${cardCls} p-6`}>
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
              <i className="bx bx-link-external text-blue-600 text-base" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-gray-800">
                Conexión del Webhook
              </h4>
              <p className="text-[10px] text-gray-400">
                Apunta tu formulario externo a esta URL
              </p>
            </div>
          </div>
          <div className="space-y-3">
            <div>
              <label className={labelCls}>URL del Endpoint (POST)</label>
              <div className="flex gap-1.5">
                <code className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs text-gray-700 font-mono break-all select-all">
                  {webhookUrl}
                </code>
                <CopyButton textToCopy={webhookUrl} copyKey="url" />
              </div>
            </div>
            <div>
              <label className={labelCls}>Header de autenticación</label>
              <div className="flex gap-1.5">
                <code className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs text-gray-700 font-mono select-all">
                  x-webhook-secret:{" "}
                  <span className="text-blue-600 font-semibold">
                    {enc.webhook_secret || "—"}
                  </span>
                </code>
                <CopyButton
                  textToCopy={enc.webhook_secret || ""}
                  copyKey="secret"
                />
              </div>
            </div>
            <div>
              <label className={labelCls}>Ejemplo del Body (JSON)</label>
              <div className="relative rounded-xl overflow-hidden">
                <pre className="bg-[#0f172a] text-emerald-300 p-4 text-[11px] font-mono overflow-x-auto leading-relaxed">
                  {ejemploBody}
                </pre>
                <button
                  onClick={() => copyToClipboard(ejemploBody, "body")}
                  className={`absolute top-3 right-3 px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all ${
                    copied === "body"
                      ? "bg-emerald-500 text-white"
                      : "bg-white/10 text-white/50 hover:bg-white/20"
                  }`}
                >
                  {copied === "body" ? "✓ Copiado" : "Copiar"}
                </button>
              </div>
              <p className="text-[10px] text-gray-400 mt-2 leading-relaxed">
                <code className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-600 font-semibold">
                  nombre
                </code>
                ,{" "}
                <code className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-600 font-semibold">
                  correo
                </code>{" "}
                y{" "}
                <code className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-600 font-semibold">
                  telefono
                </code>{" "}
                identifican al contacto. Todo lo demás se guarda como
                respuestas.
              </p>
            </div>
          </div>
        </div>
      )}
      {/* ═══ 🆕 Auto-respuesta (webhook_lead) ═══ */}
      {enc.tipo === "webhook_lead" && (
        <div className={`${cardCls} overflow-hidden`}>
          <div className="px-6 pt-5 pb-4 border-b border-gray-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center">
                <i className="bx bx-paper-plane text-violet-600 text-base" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-gray-800">
                  Respuesta automática al lead
                </h4>
                <p className="text-[10px] text-gray-400">
                  Envía un mensaje por WhatsApp al recibir un lead del webhook
                </p>
              </div>
            </div>
          </div>

          <div className="px-6 py-5">
            <ConfigMensajeEnvio
              idConfig={idConfig}
              value={mensajeEnvio}
              onChange={setMensajeEnvio}
            />
          </div>

          <div className="px-6 py-4 bg-gray-50/50 border-t border-gray-100 flex items-center justify-end">
            <button
              onClick={handleSaveEnvio}
              disabled={savingEnvio}
              className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-sm hover:shadow disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {savingEnvio ? (
                <span className="flex items-center gap-2">
                  <i className="bx bx-loader-alt bx-spin" /> Guardando...
                </span>
              ) : (
                "Guardar auto-respuesta"
              )}
            </button>
          </div>
        </div>
      )}

      {/* ═══ Satisfacción ═══ */}
      {enc.tipo === "satisfaccion" && (
        <div className={`${cardCls} overflow-hidden`}>
          <div className="px-6 pt-5 pb-4 border-b border-gray-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                <i className="bx bx-send text-blue-600 text-base" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-gray-800">
                  Configuración de envío
                </h4>
                <p className="text-[10px] text-gray-400">
                  Controla cuándo y cómo se envía la encuesta tras cerrar un
                  chat
                </p>
              </div>
            </div>
          </div>

          <div className="px-6 py-5 space-y-5">
            {/* Preview */}
            <div className="rounded-xl bg-gradient-to-r from-gray-50 to-blue-50/30 border border-gray-200/60 p-4">
              <div className="flex items-center gap-2 mb-2">
                <i className="bx bx-show text-blue-500 text-sm" />
                <span className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">
                  Vista previa
                </span>
              </div>
              <p className="text-[10px] text-gray-400 mb-3 leading-relaxed">
                Así se ve la encuesta que recibirán tus clientes. El link se
                genera automáticamente con el ID de cada cliente.
              </p>
              <code className="block bg-white border border-gray-200 rounded-lg px-3 py-2 text-[10px] text-gray-500 font-mono break-all select-all mb-3">
                {`${window.location.origin}/encuesta-publica/${enc.id}?cid={id_cliente}`}
              </code>
              <button
                type="button"
                onClick={() =>
                  window.open(
                    `${window.location.origin}/encuesta-publica/${enc.id}?cid=preview`,
                    "_blank",
                  )
                }
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-semibold transition-all shadow-sm hover:shadow"
              >
                <i className="bx bx-link-external text-xs" />
                Visualizar encuesta
              </button>
            </div>

            {/* Toggle */}
            <div className="flex items-start gap-3.5 p-4 rounded-xl bg-blue-50/60 border border-blue-200/40">
              <button
                type="button"
                onClick={() => setAutoEnviar(!autoEnviar)}
                className={`relative w-11 h-6 rounded-full transition-all shrink-0 mt-0.5 ${autoEnviar ? "bg-blue-500 shadow-sm shadow-blue-200" : "bg-gray-300"}`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${autoEnviar ? "translate-x-5" : ""}`}
                />
              </button>
              <div>
                <span className="text-sm text-gray-800 font-semibold">
                  Enviar encuesta al cerrar chat
                </span>
                <p className="text-[10px] text-gray-400 mt-0.5 leading-relaxed">
                  Cuando un asesor cierra una conversación, se envía
                  automáticamente un mensaje por WhatsApp con el link para
                  calificar
                </p>
              </div>
            </div>

            {/* 3 inputs en fila */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className={labelCls}>No repetir (horas)</label>
                <input
                  type="number"
                  min={0}
                  value={cooldown}
                  onChange={(e) => setCooldown(Number(e.target.value))}
                  className={inputCls}
                />
                <p className="text-[9px] text-gray-400 mt-1">
                  Mín.{" "}
                  <strong className="text-gray-600">{cooldown || 0}h</strong>{" "}
                  entre envíos
                </p>
              </div>
              <div>
                <label className={labelCls}>Esperar (minutos)</label>
                <input
                  type="number"
                  min={0}
                  max={1380}
                  value={delay}
                  onChange={(e) =>
                    setDelay(Math.min(1380, Number(e.target.value)))
                  }
                  className={inputCls}
                />
                <p className="text-[9px] text-gray-400 mt-1">
                  Delay de{" "}
                  <strong className="text-gray-600">{delay || 0} min</strong>{" "}
                  tras cerrar <span className="text-gray-300">(máx 23h)</span>
                </p>
              </div>
              <div>
                <label className={labelCls}>Alerta si score ≤</label>
                <input
                  type="number"
                  min={1}
                  max={5}
                  value={umbral}
                  onChange={(e) => setUmbral(Number(e.target.value))}
                  className={inputCls}
                />
                <p className="text-[9px] text-gray-400 mt-1">
                  Nota ≤ <strong className="text-gray-600">{umbral}</strong> =
                  escalación
                </p>
              </div>
            </div>

            {/* Mensaje */}
            <div>
              <label className={labelCls}>
                Mensaje que recibe el cliente por WhatsApp
              </label>
              <textarea
                value={mensaje}
                onChange={(e) => setMensaje(e.target.value)}
                rows={5}
                className={`${inputCls} resize-none font-mono text-xs leading-relaxed ${
                  !mensajeTieneLink
                    ? "border-amber-300 bg-amber-50/30 focus:border-amber-400 focus:ring-amber-100"
                    : ""
                }`}
                placeholder={DEFAULT_MENSAJE}
              />
              <div className="mt-1.5 flex items-center gap-1.5">
                <i
                  className={`bx ${mensajeTieneLink ? "bx-check-circle text-emerald-400" : "bx-error-circle text-amber-500"} text-sm shrink-0`}
                />
                {mensajeTieneLink ? (
                  <p className="text-[9px] text-emerald-500">
                    Incluye{" "}
                    <code className="bg-emerald-50 px-1 rounded font-bold">
                      {"{link}"}
                    </code>{" "}
                    correctamente.{" "}
                    <code className="bg-gray-100 text-gray-500 px-1 rounded">
                      {"{nombre}"}
                    </code>{" "}
                    = nombre del cliente.
                  </p>
                ) : (
                  <p className="text-[9px] text-amber-600 font-medium">
                    Agrega{" "}
                    <code className="bg-amber-100 px-1.5 py-0.5 rounded font-bold">
                      {"{link}"}
                    </code>{" "}
                    al mensaje para que el cliente pueda abrir la encuesta.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-gray-50/50 border-t border-gray-100 flex items-center justify-between">
            {!mensajeTieneLink && (
              <span className="text-[10px] text-amber-500 font-medium flex items-center gap-1">
                <i className="bx bx-info-circle" />
                Agrega {"{link}"} al mensaje para habilitar
              </span>
            )}
            <div className={!mensajeTieneLink ? "" : "ml-auto"}>
              <button
                onClick={handleSave}
                disabled={saving || !mensajeTieneLink}
                className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-sm hover:shadow disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <span className="flex items-center gap-2">
                    <i className="bx bx-loader-alt bx-spin" /> Guardando...
                  </span>
                ) : (
                  "Guardar cambios"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
