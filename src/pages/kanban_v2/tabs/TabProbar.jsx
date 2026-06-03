// Tab Probar — test bench, reset cliente, vista de conversación
import React, { useState, useEffect, useCallback } from "react";
import Swal from "sweetalert2";
import chatApi from "../../../api/chatcenter";
import { Card, Btn, Pill, EmptyState, Spinner } from "../componentes/ui";

const Toast = Swal.mixin({
  toast: true,
  position: "top-end",
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
  didOpen: (toast) => {
    toast.parentNode.style.zIndex = 99999;
  },
});

export default function TabProbar({
  v2Activo,
  v2Config,
  colActivaObj,
  estadosDisponibles,
  id_configuracion,
}) {
  const [testInput, setTestInput] = useState({
    id_cliente: "",
    telefono: "",
    mensaje: "Hola quiero el cooler para laptop",
    estado_contacto: colActivaObj?.estado_db || "",
  });
  const [estadoResetTarget, setEstadoResetTarget] = useState(
    colActivaObj?.estado_db || ""
  );
  const [testLoading, setTestLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [conversation, setConversation] = useState([]);
  const [loadingConv, setLoadingConv] = useState(false);

  // Sync estado_contacto cuando cambia la columna
  useEffect(() => {
    if (colActivaObj?.estado_db) {
      setTestInput((p) => ({ ...p, estado_contacto: colActivaObj.estado_db }));
      setEstadoResetTarget(colActivaObj.estado_db);
    }
  }, [colActivaObj?.estado_db]);

  const cargarConversacion = useCallback(async (idCliente) => {
    if (!idCliente) return;
    setLoadingConv(true);
    try {
      const { data } = await chatApi.post("/kanban_ia_v2/conversacion_reciente", {
        id_configuracion,
        id_cliente: parseInt(idCliente, 10),
        limit: 20,
      });
      setConversation(data?.data || []);
    } catch {
      setConversation([]);
    } finally {
      setLoadingConv(false);
    }
  }, [id_configuracion]);

  // Reload conversación cuando cambia el id_cliente
  useEffect(() => {
    if (testInput.id_cliente) {
      cargarConversacion(testInput.id_cliente);
    } else {
      setConversation([]);
    }
  }, [testInput.id_cliente, cargarConversacion]);

  const handleResetEstado = async () => {
    if (!testInput.id_cliente || !estadoResetTarget) {
      Toast.fire({
        icon: "warning",
        title: "Completa id_cliente y elige estado destino",
      });
      return;
    }
    const r = await Swal.fire({
      title: "¿Resetear estado del cliente?",
      html: `id_cliente <strong>${testInput.id_cliente}</strong> → estado <code>${estadoResetTarget}</code>`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Sí, resetear",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#3b82f6",
    });
    if (!r.isConfirmed) return;

    setResetLoading(true);
    try {
      const { data } = await chatApi.post(
        "/kanban_ia_v2/cliente/resetear_estado",
        {
          id_configuracion,
          id_cliente: parseInt(testInput.id_cliente, 10),
          estado_contacto: estadoResetTarget,
        }
      );
      Toast.fire({
        icon: "success",
        title: `Cliente movido: ${data?.data?.estado_anterior} → ${data?.data?.estado_actual}`,
      });
      // Si moviste al estado de la columna actual, también sync estado_contacto del test
      setTestInput((p) => ({ ...p, estado_contacto: estadoResetTarget }));
    } catch (err) {
      Toast.fire({
        icon: "error",
        title: err?.response?.data?.message || "Error reseteando estado",
      });
    } finally {
      setResetLoading(false);
    }
  };

  const handleProbar = async () => {
    if (!testInput.mensaje || !testInput.telefono || !testInput.id_cliente) {
      Toast.fire({
        icon: "warning",
        title: "Completa id_cliente, telefono y mensaje",
      });
      return;
    }
    setTestLoading(true);
    setTestResult(null);
    try {
      const { data } = await chatApi.post("/kanban_ia_v2/probar", {
        id_configuracion,
        id_cliente: parseInt(testInput.id_cliente, 10),
        telefono: testInput.telefono,
        mensaje: testInput.mensaje,
        estado_contacto: testInput.estado_contacto,
      });
      setTestResult(data?.resultado || data);
      // Refresca la conversación
      setTimeout(() => cargarConversacion(testInput.id_cliente), 1200);
    } catch (err) {
      setTestResult({
        ok: false,
        error: err?.response?.data?.message || err.message,
      });
    } finally {
      setTestLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Card 1 — Configurar prueba */}
      <Card title="Configurar prueba" icon="bx bx-test-tube">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              id_cliente *
            </label>
            <input
              type="number"
              value={testInput.id_cliente}
              onChange={(e) =>
                setTestInput({ ...testInput, id_cliente: e.target.value })
              }
              placeholder="403947"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              telefono (E.164) *
            </label>
            <input
              type="text"
              value={testInput.telefono}
              onChange={(e) =>
                setTestInput({ ...testInput, telefono: e.target.value })
              }
              placeholder="593984722561"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              estado_contacto (qué columna procesa)
            </label>
            <select
              value={testInput.estado_contacto}
              onChange={(e) =>
                setTestInput({ ...testInput, estado_contacto: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              {estadosDisponibles.map((es) => (
                <option key={es.value} value={es.value}>
                  {es.label} ({es.value})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-3">
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Mensaje del cliente (simulado)
          </label>
          <textarea
            rows={2}
            value={testInput.mensaje}
            onChange={(e) =>
              setTestInput({ ...testInput, mensaje: e.target.value })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="mt-4 flex items-center gap-3 flex-wrap">
          <Btn
            variant="primary"
            size="lg"
            icon="bx bx-paper-plane"
            loading={testLoading}
            onClick={handleProbar}
            disabled={!v2Activo}
          >
            Enviar prueba
          </Btn>
          {!v2Activo && (
            <Pill color="amber" icon="bx bx-error">
              Activa V2 en pestaña Resumen antes de probar
            </Pill>
          )}
          <span className="text-xs text-gray-500 ml-auto">
            ⚠ Envía un mensaje real por WhatsApp al teléfono indicado.
          </span>
        </div>
      </Card>

      {/* Card 2 — Resetear cliente */}
      <Card
        title="Resetear estado del cliente"
        icon="bx bx-reset"
      >
        <p className="text-sm text-gray-600 mb-3">
          Si el cliente ya pasó por interacciones anteriores y quieres empezar
          desde cero (sin que el assistant tenga contexto previo), muévelo al
          estado inicial.
        </p>
        <div className="flex items-end gap-3 flex-wrap">
          <div className="flex-1 min-w-[150px]">
            <label className="block text-xs font-medium text-gray-600 mb-1">
              id_cliente
            </label>
            <input
              type="number"
              value={testInput.id_cliente}
              onChange={(e) =>
                setTestInput({ ...testInput, id_cliente: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Estado destino
            </label>
            <select
              value={estadoResetTarget}
              onChange={(e) => setEstadoResetTarget(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              {estadosDisponibles.map((es) => (
                <option key={es.value} value={es.value}>
                  {es.label} ({es.value})
                </option>
              ))}
            </select>
          </div>
          <Btn
            variant="secondary"
            icon="bx bx-revision"
            loading={resetLoading}
            onClick={handleResetEstado}
          >
            Mover cliente
          </Btn>
        </div>
      </Card>

      {/* Card 3 — Resultado del último test */}
      {testResult && (
        <Card
          title="Resultado del último test"
          icon={
            testResult.ok ? "bx bx-check-circle" : "bx bx-error-circle"
          }
          action={
            <Pill color={testResult.ok ? "emerald" : "rose"}>
              {testResult.ok ? "OK" : "FALLO"}
            </Pill>
          }
        >
          {testResult.ok && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3 text-xs">
              <div>
                <span className="text-gray-500 block">vía</span>
                <Pill color="blue">{testResult.via || "—"}</Pill>
              </div>
              <div>
                <span className="text-gray-500 block">acción</span>
                <Pill color={testResult.accion === "generar_guia" ? "emerald" : "gray"}>
                  {testResult.accion || "—"}
                </Pill>
              </div>
              <div>
                <span className="text-gray-500 block">tokens</span>
                <span className="font-mono font-semibold">
                  {testResult.total_tokens || 0}
                </span>
              </div>
            </div>
          )}
          {testResult.respuesta_enviada && (
            <div className="mb-3">
              <span className="text-gray-500 block text-xs mb-1">
                Mensaje enviado al cliente
              </span>
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-900">
                {testResult.respuesta_enviada}
              </div>
            </div>
          )}
          <details>
            <summary className="text-xs text-blue-600 cursor-pointer hover:underline">
              Ver respuesta completa (JSON)
            </summary>
            <pre className="mt-2 bg-gray-900 text-emerald-300 text-xs p-3 rounded-lg overflow-x-auto max-h-96">
              {JSON.stringify(testResult, null, 2)}
            </pre>
          </details>
        </Card>
      )}

      {/* Card 4 — Conversación reciente del cliente */}
      <Card
        title="Conversación del cliente"
        icon="bx bx-message-rounded-detail"
        action={
          testInput.id_cliente && (
            <button
              onClick={() => cargarConversacion(testInput.id_cliente)}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium inline-flex items-center gap-1"
            >
              <i className="bx bx-refresh" />
              Refrescar
            </button>
          )
        }
      >
        {!testInput.id_cliente && (
          <p className="text-sm text-gray-500 italic">
            Completa id_cliente arriba para ver la conversación.
          </p>
        )}
        {testInput.id_cliente && loadingConv && (
          <p className="text-sm text-gray-500"><Spinner /> Cargando...</p>
        )}
        {testInput.id_cliente && !loadingConv && conversation.length === 0 && (
          <p className="text-sm text-gray-500 italic">Sin mensajes.</p>
        )}
        {!loadingConv && conversation.length > 0 && (
          <div className="space-y-2 max-h-96 overflow-y-auto p-2 bg-gradient-to-b from-emerald-50/30 to-gray-50 rounded-lg">
            {conversation.map((m) => {
              const isCliente = m.rol_mensaje === 0;
              const isMedia = ["image", "video", "audio"].includes(m.tipo_mensaje);
              return (
                <div
                  key={m.id}
                  className={`flex ${isCliente ? "justify-start" : "justify-end"}`}
                >
                  <div
                    className={`max-w-[80%] p-2.5 rounded-lg shadow-sm text-sm ${
                      isCliente
                        ? "bg-white border border-gray-200"
                        : "bg-emerald-100 text-emerald-900 border border-emerald-200"
                    }`}
                  >
                    <div className="text-[10px] uppercase tracking-wide opacity-60 mb-1">
                      {isCliente ? "Cliente" : (m.responsable || "Sistema")}
                    </div>
                    {isMedia ? (
                      <div className="flex items-center gap-2">
                        <i className="bx bx-image text-2xl" />
                        <a
                          href={m.ruta_archivo}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-blue-700 underline truncate max-w-[200px]"
                        >
                          {m.tipo_mensaje}: ver
                        </a>
                      </div>
                    ) : (
                      <div className="whitespace-pre-wrap break-words">
                        {m.texto_mensaje}
                      </div>
                    )}
                    <div className="text-[10px] opacity-50 mt-1">
                      {new Date(m.created_at).toLocaleString()}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
