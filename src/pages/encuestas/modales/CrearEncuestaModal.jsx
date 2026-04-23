import React, { useState } from "react";
import chatApi from "../../../api/chatcenter";
import Swal from "sweetalert2";
import { TIPO_CONFIG } from "../utils/encuestasConstants";
import ConfigMensajeEnvio from "../components/ConfigMensajeEnvio";

export default function CrearEncuestaModal({ idConfig, onCreated, onClose }) {
  const [tipo, setTipo] = useState("webhook_lead");
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [saving, setSaving] = useState(false);

  // Config de auto-respuesta (solo para webhook_lead)
  const [mensajeEnvio, setMensajeEnvio] = useState({
    mensaje_dentro_24h: "",
    template_fuera_24h: "",
    template_parameters: [],
  });

  // Estado post-creación
  const [created, setCreated] = useState(null);
  const [copied, setCopied] = useState(null);

  const handleCreate = async () => {
    if (!nombre.trim())
      return Swal.fire({ icon: "warning", title: "Ingresa un nombre" });
    setSaving(true);
    try {
      const payloadCrear = {
        id_configuracion: idConfig,
        tipo,
        nombre: nombre.trim(),
        descripcion: descripcion.trim() || null,
        preguntas: [],
        auto_enviar_al_cerrar: tipo === "satisfaccion",
      };

      const res = await chatApi.post("encuestas/crear", payloadCrear);

      //  Si es webhook_lead y configuró auto-respuesta, guardarla con PUT
      if (
        tipo === "webhook_lead" &&
        res.data?.id_encuesta &&
        (mensajeEnvio.mensaje_dentro_24h || mensajeEnvio.template_fuera_24h)
      ) {
        try {
          await chatApi.put(`encuestas/${res.data.id_encuesta}`, {
            id_configuracion: idConfig,
            mensaje_dentro_24h: mensajeEnvio.mensaje_dentro_24h || null,
            template_fuera_24h: mensajeEnvio.template_fuera_24h || null,
            template_parameters:
              mensajeEnvio.template_parameters?.length > 0
                ? mensajeEnvio.template_parameters
                : null,
          });
        } catch (updErr) {
          console.warn(
            "Encuesta creada pero falló guardar auto-respuesta:",
            updErr,
          );
        }
      }

      setCreated(res.data);
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: err.response?.data?.message || err.message,
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

  const handleClose = () => {
    if (created) onCreated(created);
    else onClose();
  };

  const inputCls =
    "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:border-blue-400 focus:ring-1 focus:ring-blue-200 outline-none transition-all";

  const webhookUrl = `https://chat.imporfactory.app/api/v1/webhook_contactos/inbound`;

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

  const CopyBtn = ({ text, k, label }) => (
    <button
      onClick={() => copyToClipboard(text, k)}
      className={`px-3 py-2 rounded-lg border text-xs font-medium transition-colors shrink-0 ${
        copied === k
          ? "bg-emerald-50 border-emerald-200 text-emerald-600"
          : "bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100"
      }`}
      title={label || "Copiar"}
    >
      <i className={`bx ${copied === k ? "bx-check" : "bx-copy"} text-sm`} />
    </button>
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={handleClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 p-6 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ═══ Vista post-creación: mostrar datos de conexión ═══ */}
        {created ? (
          <>
            {/* Header éxito */}
            <div className="text-center mb-5">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-100 mb-3">
                <i className="bx bx-check text-3xl text-emerald-600" />
              </div>
              <h3 className="font-bold text-gray-800 text-lg">
                ¡Encuesta creada!
              </h3>
              <p className="text-xs text-gray-400 mt-1">
                {tipo === "webhook_lead"
                  ? "Configura tu formulario con los datos de abajo para empezar a recibir respuestas"
                  : "La encuesta se enviará automáticamente cuando un asesor cierre un chat"}
              </p>
            </div>

            {/* Datos de conexión para webhook_lead */}
            {tipo === "webhook_lead" && created.webhook_secret && (
              <div className="space-y-3 mb-5">
                {/* URL */}
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-1">
                    1. URL del Endpoint (POST)
                  </label>
                  <div className="flex gap-1.5">
                    <code className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-700 font-mono break-all select-all">
                      {webhookUrl}
                    </code>
                    <CopyBtn text={webhookUrl} k="url" />
                  </div>
                </div>

                {/* Header */}
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-1">
                    2. Header de autenticación
                  </label>
                  <div className="flex gap-1.5">
                    <code className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-700 font-mono select-all">
                      x-webhook-secret:{" "}
                      <span className="text-blue-600">
                        {created.webhook_secret}
                      </span>
                    </code>
                    <CopyBtn text={created.webhook_secret} k="secret" />
                  </div>
                </div>

                {/* Body ejemplo */}
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-1">
                    3. Ejemplo del Body (JSON)
                  </label>
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
                  <p className="text-[9px] text-gray-400 mt-1.5 leading-relaxed">
                    Los campos{" "}
                    <code className="bg-gray-100 px-1 rounded">nombre</code>,{" "}
                    <code className="bg-gray-100 px-1 rounded">correo</code> y{" "}
                    <code className="bg-gray-100 px-1 rounded">telefono</code>{" "}
                    identifican al contacto. Todo lo demás se guarda como
                    respuestas.
                  </p>
                </div>
              </div>
            )}

            {/* Info para satisfacción */}
            {tipo === "satisfaccion" && (
              <div className="bg-blue-50 rounded-xl p-4 mb-5 border border-blue-100">
                <div className="flex items-start gap-2">
                  <i className="bx bx-info-circle text-blue-500 text-lg mt-0.5 shrink-0" />
                  <div className="text-xs text-blue-700 leading-relaxed">
                    <p className="font-semibold mb-1">¿Cómo funciona?</p>
                    <p>
                      Cuando un asesor cierre un chat, se enviará
                      automáticamente un mensaje por WhatsApp con el link de la
                      encuesta al cliente.
                    </p>
                    <p className="mt-1">
                      Puedes personalizar el mensaje, el cooldown y el delay
                      desde la pestaña de <strong>Configuración</strong> de la
                      encuesta.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Botón cerrar */}
            <div className="flex justify-end pt-3 border-t border-gray-100">
              <button
                onClick={handleClose}
                className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors"
              >
                Entendido, cerrar
              </button>
            </div>
          </>
        ) : (
          <>
            {/* ═══ Vista de creación ═══ */}
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-gray-800 text-lg">
                Nueva encuesta
              </h3>
              <button
                onClick={onClose}
                className="p-1 rounded-md hover:bg-gray-100"
              >
                <i className="bx bx-x text-xl text-gray-400" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Tipo */}
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-2">
                  ¿Qué tipo de encuesta necesitas?
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(TIPO_CONFIG).map(([key, val]) => (
                    <button
                      key={key}
                      onClick={() => setTipo(key)}
                      className={`px-3 py-3 rounded-xl border text-left transition-all ${
                        tipo === key
                          ? "border-blue-400 bg-blue-50 ring-1 ring-blue-200"
                          : "border-gray-200 text-gray-500 hover:bg-gray-50"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <i
                          className={`bx ${val.icon} text-lg ${tipo === key ? "text-blue-600" : "text-gray-400"}`}
                        />
                        <span
                          className={`text-xs font-semibold ${tipo === key ? "text-blue-700" : "text-gray-700"}`}
                        >
                          {val.label}
                        </span>
                      </div>
                      <p className="text-[10px] text-gray-400 leading-relaxed">
                        {val.descripcionCorta}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Descripción del tipo */}
              <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                <p className="text-xs text-gray-500 leading-relaxed">
                  <i className="bx bx-info-circle text-blue-400 mr-1" />
                  {TIPO_CONFIG[tipo]?.descripcionLarga}
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                <p className="text-xs text-blue-700">
                  <i className="bx bx-info-circle mr-1" />
                  {tipo === "satisfaccion"
                    ? "El cliente verá este título y descripción cuando reciba la encuesta."
                    : "Esta información es interna y te ayuda a identificar la encuesta."}
                </p>
              </div>

              {/* Nombre */}
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-1">
                  Nombre de la encuesta
                </label>
                <input
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className={inputCls}
                  placeholder={
                    tipo === "webhook_lead"
                      ? "Ej: Leads Club de Importadores"
                      : "Ej: Satisfacción Post-Chat"
                  }
                />
              </div>

              {/* Descripción */}
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-1">
                  Descripción{" "}
                  <span className="normal-case text-gray-300">(opcional)</span>
                </label>
                <textarea
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  className={inputCls}
                  rows={2}
                  placeholder="Descripción breve de para qué sirve esta encuesta..."
                />
              </div>

              {/* 🆕 Auto-respuesta (solo webhook_lead) */}
              {tipo === "webhook_lead" && (
                <div className="pt-4 border-t border-gray-100">
                  <ConfigMensajeEnvio
                    idConfig={idConfig}
                    value={mensajeEnvio}
                    onChange={setMensajeEnvio}
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 mt-5 pt-4 border-t border-gray-100">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-xs text-gray-500 hover:bg-gray-100"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreate}
                disabled={saving}
                className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold disabled:opacity-50"
              >
                {saving ? "Creando..." : "Crear encuesta"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
