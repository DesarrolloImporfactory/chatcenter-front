import React, { useState } from "react";
import chatApi from "../../../api/chatcenter";
import Swal from "sweetalert2";

export default function ConfigPanel({ enc, idConfig, onUpdated }) {
  const [cooldown, setCooldown] = useState(enc.cooldown_horas);
  const [delay, setDelay] = useState(enc.delay_envio_minutos);
  const [autoEnviar, setAutoEnviar] = useState(enc.auto_enviar_al_cerrar === 1);
  const [umbral, setUmbral] = useState(enc.umbral_escalacion);
  const [mensaje, setMensaje] = useState(enc.mensaje_envio || "");
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(null);

  const handleSave = async () => {
    setSaving(true);
    try {
      await chatApi.put(`encuestas/${enc.id}`, {
        id_configuracion: idConfig,
        cooldown_horas: cooldown,
        delay_envio_minutos: delay,
        auto_enviar_al_cerrar: autoEnviar,
        umbral_escalacion: umbral,
        mensaje_envio: mensaje || null,
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

  const copyToClipboard = (text, key) => {
    navigator.clipboard?.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const inputCls =
    "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:border-blue-400 focus:ring-1 focus:ring-blue-200 outline-none transition-all";
  const labelCls =
    "block text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-1";

  const webhookUrl = `${window.location.origin}/api/v1/webhook_contactos/inbound`;

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

  const CopyButton = ({ textToCopy, copyKey, label }) => (
    <button
      onClick={() => copyToClipboard(textToCopy, copyKey)}
      className={`px-3 py-2 rounded-lg border text-xs font-medium transition-colors shrink-0 ${
        copied === copyKey
          ? "bg-emerald-50 border-emerald-200 text-emerald-600"
          : "bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100"
      }`}
      title={label || "Copiar"}
    >
      <i
        className={`bx ${copied === copyKey ? "bx-check" : "bx-copy"} text-sm`}
      />
    </button>
  );

  return (
    <div className="space-y-4">
      {/* ═══ Webhook: URL + Secret + Ejemplo (solo webhook_lead) ═══ */}
      {enc.tipo === "webhook_lead" && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-2">
            <i className="bx bx-link-external text-blue-500" />
            Conexión del Webhook
          </h4>
          <p className="text-xs text-gray-400 mb-4 leading-relaxed">
            Configura tu formulario o funnel externo para enviar los datos a
            esta URL. Los campos{" "}
            <code className="bg-gray-100 px-1 rounded text-gray-600">
              nombre
            </code>
            ,{" "}
            <code className="bg-gray-100 px-1 rounded text-gray-600">
              correo
            </code>{" "}
            y{" "}
            <code className="bg-gray-100 px-1 rounded text-gray-600">
              telefono
            </code>{" "}
            se usan para identificar al contacto. Todo lo demás se guarda como
            respuestas.
          </p>

          <div className="mb-3">
            <label className={labelCls}>URL del Endpoint (POST)</label>
            <div className="flex gap-1.5">
              <code className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-700 font-mono break-all select-all">
                {webhookUrl}
              </code>
              <CopyButton textToCopy={webhookUrl} copyKey="url" />
            </div>
          </div>

          <div className="mb-3">
            <label className={labelCls}>Header de autenticación</label>
            <div className="flex gap-1.5">
              <code className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-700 font-mono select-all">
                x-webhook-secret:{" "}
                <span className="text-blue-600">
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
            <div className="relative">
              <pre className="bg-gray-900 text-emerald-300 rounded-lg p-3 text-[11px] font-mono overflow-x-auto leading-relaxed">
                {ejemploBody}
              </pre>
              <button
                onClick={() => copyToClipboard(ejemploBody, "body")}
                className={`absolute top-2 right-2 px-2 py-1 rounded-md text-[10px] font-medium transition-colors ${
                  copied === "body"
                    ? "bg-emerald-600 text-white"
                    : "bg-white/10 text-white/60 hover:bg-white/20"
                }`}
              >
                {copied === "body" ? "Copiado" : "Copiar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Configuración de envío (SOLO satisfacción) ═══ */}
      {enc.tipo === "satisfaccion" && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-2">
            <i className="bx bx-send text-blue-500" />
            Configuración de envío
          </h4>
          <p className="text-xs text-gray-400 mb-4 leading-relaxed">
            Controla cuándo y cómo se envía la encuesta al cliente después de
            que un asesor cierra su chat.
          </p>

          {/* Auto-envío toggle */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-50/50 border border-blue-100 mb-4">
            <button
              type="button"
              onClick={() => setAutoEnviar(!autoEnviar)}
              className={`relative w-10 h-5 rounded-full transition-colors shrink-0 ${autoEnviar ? "bg-blue-500" : "bg-gray-300"}`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${autoEnviar ? "translate-x-5" : ""}`}
              />
            </button>
            <div>
              <span className="text-sm text-gray-700 font-medium">
                Enviar encuesta al cerrar chat
              </span>
              <p className="text-[10px] text-gray-400 mt-0.5">
                Cuando un asesor resuelve y cierra una conversación, se envía
                automáticamente un mensaje por WhatsApp con el link para
                calificar
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>No repetir antes de (horas)</label>
              <input
                type="number"
                min={0}
                value={cooldown}
                onChange={(e) => setCooldown(Number(e.target.value))}
                className={inputCls}
              />
              <p className="text-[9px] text-gray-400 mt-0.5">
                Si un cliente ya recibió la encuesta hace menos de{" "}
                <strong>{cooldown || 0}h</strong>, no se le vuelve a enviar
                aunque le cierren otro chat
              </p>
            </div>
            <div>
              <label className={labelCls}>Esperar antes de enviar (min)</label>
              <input
                type="number"
                min={0}
                value={delay}
                onChange={(e) => setDelay(Number(e.target.value))}
                className={inputCls}
              />
              <p className="text-[9px] text-gray-400 mt-0.5">
                En vez de enviar al instante, espera{" "}
                <strong>{delay || 0} minutos</strong> después de cerrar el chat
                para no parecer un bot
              </p>
            </div>
          </div>

          <div className="mt-3">
            <label className={labelCls}>
              Alerta si el cliente califica con
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                max={5}
                value={umbral}
                onChange={(e) => setUmbral(Number(e.target.value))}
                className={`${inputCls} w-20`}
              />
              <span className="text-sm text-gray-500">o menos (de 5)</span>
            </div>
            <p className="text-[9px] text-gray-400 mt-0.5">
              Si el cliente da una nota de {umbral} o menos, la respuesta se
              marca como "escalada" para que puedas revisarla y tomar acción
            </p>
          </div>

          <div className="mt-4">
            <label className={labelCls}>Mensaje que recibe el cliente</label>
            <textarea
              value={mensaje}
              onChange={(e) => setMensaje(e.target.value)}
              rows={4}
              className={inputCls}
              placeholder={
                "¡Gracias por comunicarte, {nombre}! 🙏\n\nCalifica tu experiencia:\n👉 {link}"
              }
            />
            <p className="text-[9px] text-gray-400 mt-1 leading-relaxed">
              <code className="bg-gray-100 px-1 rounded">{"{nombre}"}</code> se
              reemplaza por el nombre del cliente y{" "}
              <code className="bg-gray-100 px-1 rounded">{"{link}"}</code> por
              el link de la encuesta
            </p>
          </div>

          <div className="flex justify-end pt-4 mt-4 border-t border-gray-100">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors disabled:opacity-50"
            >
              {saving ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
